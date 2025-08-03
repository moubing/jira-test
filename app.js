var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fetch = require('node-fetch').default;

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

const webhook = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=f452d1a1-c71c-4044-a698-b598cec3eadc';
const message = {
  msgtype: 'markdown',
  markdown: {
    content: '**Markdown 格式消息**\n- 好玩\n- 状态：已完成\n[点击查看详情](https://xxxx.com)'
  }
};

app.post('/hello', async (req, res) => {
  try {
    console.log('Received Jira Webhook:', req.body);
    
    // 发送请求到企业微信
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    
    const responseData = await response.json();
    console.log('企业微信响应：', responseData);
    
    res.status(200).send('Webhook received!');
  } catch (error) {
    console.error('请求失败：', error);
    res.status(500).send('Failed to send message to WeChat');
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;