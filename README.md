## mysql同步数据到clickhouse数据审计工具

### 如何使用？
安装  
```bash
  npm install gioneco-data-audit
```
项目中使用

- 初始化数据表
``` bash
./node_modules/.bin/gioneco-data-audit init

```

- 怎么使用
```js
const AuditData = require("gioneco-data-audit").default;
let auditData = new AuditData({
  // mysql连接参数
  type: "mysql",
  host: "127.0.0.1",
  username: "root",
  password: "12345678",
  port: "3306",
  database: "ty_metro_trip",
  logging: true
}, {
  //clickhouse连接参数
  host: "10.255.50.45",
  port: "8123",
  user: "default",
  password: "",
  queryOptions: {
    database: "default"
  }
}, {
  // mysql clickhouse数据表映射 orders为mysql数据表  t-real-data-order-pay-success为clickhouse数据表
  orders: "t-real-data-order-pay-success"
})
auditData.init().then(async _this => {
  const item = {
    orderNo: "212019101722200055499683",
    userId: "YVP0CXJG4M"
  }

  //同步数据到审计数据缓存表
  await _this.syncDataToAuditCache({
    uuid: item.orderNo,
    auditTable: "orders",
    uuidColumn: "orderNo",
    extra: JSON.stringify({
      userId: item.userId,
      orderType: 1
    })
  })
  // 执行数据审计任务，可以将方法放在定时任务内
  await _this.run({
    startTime: "2019-10-21 09:00:00",
    endTime: moment().format("YYYY-MM-DD HH:mm:ss"),
    auditTable: "orders"
  });
})
```