const SquareConnect = require("square-connect");
const defaultClient = SquareConnect.ApiClient.instance;
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");
const Moment = require("moment");
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
  run_config.NextDay = Moment(today).add(1, "d").format("DD");
  run_config.NextDate = Moment(today).add(1, "d").format("YYYY-MM-DD");

  if (!_.isEqual(Moment(`${today} 00:00:01`).add(1, "d").format("MM"), Moment(today).format("MM"))) {
    run_config.fileItem = `items-${run_config.Year}-${_.padStart(run_config.Month, 2, "0")}-${_.padStart(run_config.Day, 2, "0")}-${run_config.NextDate}.csv`;
    run_config.fileTransaction = `transactions-${run_config.Year}-${_.padStart(run_config.Month, 2, "0")}-${_.padStart(run_config.Day, 2, "0")}-${run_config.NextDate}.csv`;
  } else {
    run_config.fileItem = `items-${run_config.Year}-${_.padStart(run_config.Month, 2, "0")}-${_.padStart(run_config.Day, 2, "0")}-${run_config.Year}-${_.padStar(run_config.Month, 2, "0")}-${_.padStart(run_config.NextDay, 2, "0")}.csv`;
    run_config.fileTransaction = `transactions-${run_config.Year}-${_.padStart(run_config.Month, 2, "0")}-${_.padStart(run_config.Day, 2, "0")}-${run_config.Year}-${_.padStart(run_config.Month, 2, "0")}-${_.padStart(run_config.NextDay, 2, "0")}.csv`;
  }

  run_config.NextDate = Moment()
    .add(1, "d")
    .format("YYYY-MM-DD");
  // convert date
  run_config.Date = `${_.padStart(run_config.Day, 2, "0")}/${_.padStart(
    run_config.Month,
    2,
    "0"
  )}/${run_config.Year}`;
  run_config.EndDate = Moment([run_config.Year, run_config.Month - 1])
    .endOf("month")
    .format("DD/MM/YYYY");
}

/**
 * Main Function
 * @returns {Promise<void>}
 */
async function main() {
  // accept date as input args and map to beginTime and endTime
  await requestMapping();

  try {
    const SqOpts = {
      order: "DESC",
      beginTime: "2019-07-11T00:00:00",
      endTime: "2019-07-11T23:59:59",
      limit: 200,
      includePartial: true
    };
    const paymentsData = await SqApiInstance.listPayments(
      square_config.location_id,
      SqOpts
    );
    const refundsData = await SqApiInstance.listRefunds(
      square_config.location_id,
      SqOpts
    );
    const filteredPaymentsData = _.filter(paymentsData, o => {
      return o.itemizations.length > 0;
    });

    filteredPaymentsData.map(payment => {
      console.log("-------------------------------");
      console.log(payment.id);
      //console.log(payment.tender);
      //console.log(payment.itemizations);
      const items = payment.itemizations;
      items.map(item => {
        if (item.quantity < 0) {
          console.log(
            `${item.name} (${item.quantity}) tax(${JSON.stringify(
              item.taxes
            )}) $ {item.total_money.amount/100} ${JSON.stringify(
              item.modifiers
            )}`
          );
        }
      });
    });

    refundsData.map(refund => {
      console.log(refund);
    });
  } catch (error) {
    console.error(error);
  }
}

main();
