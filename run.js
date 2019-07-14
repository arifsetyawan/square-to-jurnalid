const SquareConnect = require("square-connect");
const defaultClient = SquareConnect.ApiClient.instance;
const _ = require("lodash");
const auth_config = require("./config/auth.config");
const square_config = require("./config/square.config");

// Configure OAuth2 access token for authorization: oauth2
var oauth2 = defaultClient.authentications["oauth2"];
oauth2.accessToken = auth_config.square.oauth.accessToken;

var apiInstance = new SquareConnect.V1TransactionsApi();
var locationId = square_config.location_id;
var opts = {
  order: "DESC",
  beginTime: "2019-07-11T00:00:00",
  endTime: "2019-07-11T23:59:59",
  limit: 200,
  'includePartial': true
};

async function main() {
  try {
    const paymentsData = await apiInstance.listPayments(locationId, opts);
    const refundsData = await apiInstance.listRefunds(locationId, opts);
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
