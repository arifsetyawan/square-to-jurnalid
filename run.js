const SquareConnect = require("square-connect");
const defaultClient = SquareConnect.ApiClient.instance;
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");
const Moment = require("moment-timezone");
const argv = require("minimist")(process.argv.slice(2));
const fileUtil = require("./util/file");
const numberUtil = require("./util/number");
const auth_config = require("./config/auth.config");
const square_config = require("./config/square.config");
const jurnal_config = require("./config/jurnal.config");
const run_config = require("./config/run.config");

/**
 * Squareup Connection Config
 * =======================================================
 */
const oauth2 = defaultClient.authentications["oauth2"];
oauth2.accessToken = auth_config.square.oauth.accessToken;
const SqApiInstance = new SquareConnect.V1TransactionsApi();

/**
 * Request Mapping Function
 */
async function requestMapping() {
  // parsing date
  run_config.Day = argv.d ? _.padStart(argv.d, 2, "0") : Moment().format("DD");
  run_config.Month = argv.m ? _.padStart(argv.m, 2, "0") : Moment().format("MM");
  run_config.Year = argv.y || argv.year || Moment().format("YYYY");
  run_config.InvoiceNumber = `POS${run_config.Year}${run_config.Month}${run_config.Day}`;
  const today = `${run_config.Year}-${run_config.Month}-${run_config.Day}`;
  run_config.BeginTime = Moment(today).tz("Asia/Makassar").format("YYYY-MM-DDTHH:mm:ss");
  run_config.EndTime = Moment(today).tz("Asia/Makassar").add(24, 'h').subtract(1, 's').format("YYYY-MM-DDTHH:mm:ss");
}

/**
 * Main Function
 * @returns {Promise<void>}
 */
async function main() {
  // accept date as input args and map to beginTime and endTime
  await requestMapping();

  try {
    const trxPaidCash = [];
    const trxPaidBank = [];
    const trxPaidCashTax = [];
    const trxPaidBankTax = [];
    const trxDebt = [];

    const ignoredList = [];

    let rowOfTrx = [];
    let jurnalTemplateHeader = {};
    let jurnalSalesTemplate = {};
    let squareJurnalMenuList = {};
    let targetTrxArr = [];
    let taxName = "";

    run_config.InvoiceNumber = `POS${run_config.Year}${run_config.Month}${run_config.Day}`;

    // Getting header template
    jurnalSalesTemplate = await fileUtil.readFile(`${__dirname}/asset/jurnal_sales_template.csv`);
    jurnalSalesTemplate = Papa.parse(jurnalSalesTemplate, {
      delimiter: ',',
      quoteChar: '"',
      escapeChar: '"',
      header: true
    });
    jurnalSalesTemplate = jurnalSalesTemplate.meta.fields;

    // Getting menu lists
    squareJurnalMenuList = await fileUtil.readFile(`${__dirname}/asset/square_jurnal_menu_list.csv`);
    squareJurnalMenuList = Papa.parse(squareJurnalMenuList, {
      delimiter: ',',
      quoteChar: '"',
      escapeChar: '"',
      header: true
    });
    squareJurnalMenuList = squareJurnalMenuList.data;

    // Communicating with square API
    const SqOpts = {
      order: "DESC",
      beginTime: run_config.BeginTime,
      endTime: run_config.EndTime,
      limit: 200,
      includePartial: true
    };
    const paymentsData = await SqApiInstance.listPayments(square_config.location_id, SqOpts);
    const refundsData = await SqApiInstance.listRefunds(square_config.location_id, SqOpts);
    const filteredPaymentsData = _.filter(paymentsData, o => {
      return o.itemizations.length > 0;
    });

    filteredPaymentsData.map(payment => {
      console.log("-------------------------------");
      // console.log(payment);

      const payment_id = payment.id;
      const tender = payment.tender[0];
      const items = payment.itemizations;

      let jurnal_transactionDate = `${_.padStart(run_config.Day, 2, '0')}/${_.padStart(run_config.Month, 2, '0')}/${run_config.Year}`;
      let jurnal_transactionDueDate = jurnal_transactionDate;

      // console.log(payment.tender);
      // console.log(payment.tender.length);
      // console.log('tender', tender.type, 'name', tender.name);


      // Iterating through items
      items.map(item => {

        const item_name = item.name;
        const item_variation_name = item.item_variation_name;
        const item_quantity = item.quantity;
        const item_gross_amount = numberUtil.calibrateAmount(item.gross_sales_money.amount);
        const item_total_amount = numberUtil.calibrateAmount(item.total_money.amount);
        const item_single_amount = numberUtil.calibrateAmount(item.single_quantity_money.amount);
        const item_discount_amount = numberUtil.calibrateAmount(item.discount_money.amount);
        const item_id = item.item_detail.item_id;

        let item_tax_amount = 0;
        let item_mod_name = "";
        let item_mod_amount = 0;

        let jurnal_isPaid = '';
        let jurnal_paymentMethod = '';
        let jurnal_payToAccountCode = '';
        let jurnal_invoiceNumber = run_config.InvoiceNumber;
        let jurnal_discountValue = 0;
        let jurnal_taxName = "";
        let jurnal_taxRate = 0;
        let jurnal_tenderNote = "";
        let jurnal_itemName = "";

        if (item.discounts.length > 0) {
          jurnal_discountValue = numberUtil.calculateDiscountNumber(item_gross_amount, item_discount_amount);
        }

        if (item.taxes.length > 0) {
          const item_taxes = item.taxes[0];
          item_tax_amount = numberUtil.calibrateAmount(item_taxes.applied_money.amount);
          jurnal_taxRate = 10;
        }

        // Tender Check
        if (_.toUpper(tender.type) === "CASH") {
          jurnal_isPaid = "yes";
          jurnal_paymentMethod = "Cash";
          jurnal_payToAccountCode = jurnal_config.paymentMethodList.kas_kasir;
          if (item_tax_amount > 0) {
            jurnal_invoiceNumber = `${run_config.InvoiceNumber}-PPN`;
            jurnal_taxName = "PPn";
            targetTrxArr = trxPaidCashTax;
          } else {
            targetTrxArr = trxPaidCash;
          }
        } else if (_.toLower(tender.name).includes('hutang')) {
          targetTrxArr = trxDebt;
          jurnal_transactionDueDate = `${_.padStart(1, 2, '0')}/${_.padStart((run_config.Month + 1), 2, '0')}/${run_config.Year}`;
          jurnal_invoiceNumber = `${run_config.InvoiceNumber}-${_.camelCase(tender.name)}`;
          jurnal_tenderNote = tender.name;
        } else {
          jurnal_isPaid = "yes";
          jurnal_paymentMethod = "Transfer Bank";
          jurnal_payToAccountCode = jurnal_config.paymentMethodList.transfer_bca;
          if (item_tax_amount > 0) {
            jurnal_invoiceNumber = `${run_config.InvoiceNumber}-OTH-PPN`;
            jurnal_taxName = "PPn";
            targetTrxArr = trxPaidBankTax;
            jurnal_tenderNote = tender.name;
          } else {
            jurnal_invoiceNumber = `${run_config.InvoiceNumber}-OTH`;
            targetTrxArr = trxPaidBank;
            jurnal_tenderNote = tender.name;
          }
        }

        if (item.modifiers.length > 0) {
          console.log(item.modifiers[0].name);
        } else {
          console.log('no modifier');
        }

        // TODO: Item Name Conversion
        let selectedItem = _.find(squareJurnalMenuList, (o) => {
          if (item.modifiers.length > 0) {
            return o.square_item_name === item.name && o.square_item_variant === item.item_variation_name && o.square_item_modifier === item.modifiers[0].name;
          } else {
            return o.square_item_name === item.name && o.square_item_variant === item.item_variation_name && _.isEmpty(o.square_item_modifier);
          }
        });

        if (_.isEmpty(selectedItem)) {
            ignoredList.push({
              name: item_name, variant: item_variation_name,amount: item_total_amount, tax: item_tax_amount, quantity: item_quantity,
              payment_type: jurnal_paymentMethod, modifiers: JSON.stringify(item.modifiers)
            });
        } else {
          jurnal_itemName = selectedItem.jurnal_item_name;
        }

        // Writting result to Array
        rowOfTrx = [
          run_config.Customer,
          '',
          '',
          '',
          jurnal_transactionDate,
          jurnal_transactionDueDate,
          '',
          '',
          '',
          '',
          jurnal_invoiceNumber,
          '',
          '',
          jurnal_itemName,
          `${payment_id}_${item_id}`,
          item_quantity,
          '',
          item_total_amount,
          jurnal_discountValue,
          '',
          jurnal_taxName,
          jurnal_taxRate,
          '',
          jurnal_isPaid,
          jurnal_paymentMethod,
          jurnal_payToAccountCode,
          jurnal_tenderNote,
          ''
        ];

        targetTrxArr.push(rowOfTrx);

      });

    });

    refundsData.map(refund => {
      console.log('REFUND ===========');
      console.log(refund);
    });

    // Export
    const unparseConfig = {
      quotes: true,
      quoteChar: '"',
      escapeChar: '"',
      delimiter: ',',
      header: true
    };

    const exportPaidCashList = await Papa.unparse({
      fields: jurnalTemplateHeader,
      data: trxPaidCash
    }, unparseConfig);
    await fileUtil.fs.writeFileSync(`${__dirname}/result/jurnal_sales_paid_cash.csv`, exportPaidCashList);

    const exportPaidCashListTax = await Papa.unparse({
      fields: jurnalTemplateHeader,
      data: trxPaidCashTax
    }, unparseConfig);
    await fileUtil.fs.writeFileSync(`${__dirname}/result/jurnal_sales_paid_cash_tax.csv`, exportPaidCashListTax);

    const exportPaidBankList = await Papa.unparse({
      fields: jurnalTemplateHeader,
      data: trxPaidBank
    }, unparseConfig);
    await fileUtil.fs.writeFileSync(`${__dirname}/result/jurnal_sales_paid_bank.csv`, exportPaidBankList);

    const exportPaidBankListTax = await Papa.unparse({
      fields: jurnalTemplateHeader,
      data: trxPaidBankTax
    }, unparseConfig);
    await fileUtil.fs.writeFileSync(`${__dirname}/result/jurnal_sales_paid_bank_tax.csv`, exportPaidBankListTax);

    const exportDebtList = await Papa.unparse({
      fields: jurnalTemplateHeader,
      data: trxDebt
    }, unparseConfig);
    await fileUtil.fs.writeFileSync(`${__dirname}/result/jurnal_sales_debt.csv`, exportDebtList);

    const exportIgnoreList = await Papa.unparse({
      data: ignoredList
    }, unparseConfig);
    await fileUtil.fs.writeFileSync(`${__dirname}/result/ignored.csv`, exportIgnoreList);

  } catch (error) {
    console.error(error);
  }
}

main();
