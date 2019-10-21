const AuditData = require("../dist").default;
const moment = require("moment");

const auditData = new AuditData({
  type: "mysql",
  host: "127.0.0.1",
  username: "root",
  password: "12345678",
  port: "3306",
  database: "ty_metro_trip",
  logging: true
}, {
  host: "10.255.50.45", port: "8123", user: "default", password: ""
}, {
  orders: "t-real-data-order-pay-success"
})
auditData.init().then(async _this => {
  const testData = [
    {
      orderNo: "212019101722200055499683",
      userId: "YVP0CXJG4M"
    }
  ];
  for (const item of testData) {
    await _this.syncDataToAuditCache({
      uuid: item.orderNo,
      auditTable: "orders",
      uuidColumn: "orderNo",
      extra: JSON.stringify({
        userId: item.userId,
        orderType: 1
      })
    })
  }
  console.log("success");
  // await _this.testRun();
  await _this.run({
    startTime: "2019-10-21 09:00:00",
    endTime: moment().format("YYYY-MM-DD HH:mm:ss"),
    audit_table: "orders"
  });
  process.exit();
})