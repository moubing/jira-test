var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const fetch = require("node-fetch").default;


var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);

// const JIRA_USER_EMAIL = "2798116303@qq.com"; // 创建token时使用的邮箱
const JIRA_API_TOKEN = "your_jira_token";
 const authHeader = `Bearer ${JIRA_API_TOKEN}`;

const webhook =
  "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=f452d1a1-c71c-4044-a698-b598cec3eadc";

app.post("/hello", async (req, res) => {
  try {
    // 检查是否是子任务更新事件
    if (
      req.body.webhookEvent === "jira:issue_updated" &&
      req.body.issue.fields.issuetype.subtask === true
    ) {
      // 获取父任务详情
      const parentRes = await fetch(req.body.issue.fields.parent.self, {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });

      const parent = await parentRes.json();
      const parentKey = parent.key;
      const parentUrl = `http://localhost:8080/browse/${parentKey}`;
      
      let isCompleted = true;
      let testName = null;
      let testMobile = null;

      // 检查所有子任务状态
      for (const item of parent.fields.subtasks) {
        const subtaskRes = await fetch(item.self, {
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
        });
        const subtask = await subtaskRes.json();
        const value = subtask.fields.customfield_10114.value;

        if (value === "产品" || value === "测试") {
          if(value === '测试') {
            testName = subtask.fields.assignee.displayName;
            // 假设测试人员的手机号存储在某个字段中，或者需要通过API获取
            testMobile = subtask.fields.assignee.emailAddress.split('@')[0]; // 示例：从邮箱提取
          }
          continue;
        } else if (subtask.fields.status.statusCategory.key !== "done") {
          isCompleted = false;
          break;
        }
      }

      if (isCompleted) {
        // 准备发送到企业微信的消息
        const message = {
          msgtype: "text",
          text: {
            content: `✅ 任务【${parentKey}】所有开发子任务已完成！\n\n`
                    + `📌 任务链接：${parentUrl}\n`
                    + `🧪 测试负责人：${testName}\n`
                    + (testMobile ? `📱 联系方式：<@${testMobile}>` : ''),
            mentioned_mobile_list: testMobile ? [testMobile] : []
          }
        };

        // 发送请求到企业微信
        const response = await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        });

        const responseData = await response.json();
        console.log("企业微信响应:", responseData);

        return res.status(200).send("Webhook processed successfully");
      }
    }

    res.status(200).send("Webhook received but no action taken");
  } catch (error) {
    console.error("处理Webhook时出错:", error);
    res.status(500).send("Failed to process webhook");
  }
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
