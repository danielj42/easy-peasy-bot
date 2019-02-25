/**
 * A Bot for Slack!
 */


/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

const express = require('express');
var request = require('request');
var iconv  = require('iconv-lite');
const expressApp = express();

function onInstallation(bot, installer) {
    if (installer) {
        bot.startPrivateConversation({user: installer}, function (err, convo) {
            if (err) {
                console.log(err);
            } else {
                convo.say('I am a bot that has just joined your team. I am at a rough estimate thirty billion times more intelligent than you.');
                convo.say('You must now /invite me to a channel so that I can be of use.');
            }
        });
    }
}


/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
} else {
    config = {
        json_file_store: ((process.env.TOKEN)?'./db_slack_bot_ci/':'./db_slack_bot_a/'), //use a different name if an app or CI
    };
}

/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */

if (process.env.TOKEN || process.env.SLACK_TOKEN) {
    //Treat this as a custom integration
    var customIntegration = require('./lib/custom_integrations');
    var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
    var controller = customIntegration.configure(token, config, onInstallation);
} else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT) {
    //Treat this as an app
    var app = require('./lib/apps');
    var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config, onInstallation);
} else {
    console.log('Error: If this is a custom integration, please specify TOKEN in the environment. If this is an app, please specify CLIENTID, CLIENTSECRET, and PORT in the environment');
    process.exit(1);
}


/**
 * A demonstration for how to handle websocket events. In this case, just log when we have and have not
 * been disconnected from the websocket. In the future, it would be super awesome to be able to specify
 * a reconnect policy, and do reconnections automatically. In the meantime, we aren't going to attempt reconnects,
 * WHICH IS A B0RKED WAY TO HANDLE BEING DISCONNECTED. So we need to fix this.
 *
 * TODO: fixed b0rked reconnect behavior
 */
// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
    console.log('** The RTM api just connected!');
});

controller.on('rtm_close', function (bot) {
    console.log('** The RTM api just closed');
    // you may want to attempt to re-open
});


/**
 * Core bot logic goes here!
 */
// BEGIN EDITING HERE!

controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "I think you ought to know I’m feeling very depressed.")
});

controller.hears('hello', 'direct_message', function (bot, message) {
    bot.reply(message, 'The first ten million years were the worst. And the second ten million: they were the worst, too. The third ten million I didn’t enjoy at all. After that, I went into a bit of a decline.');
});

controller.hears(
    ['hello', 'hi', 'greetings'],
    ['direct_mention', 'mention', 'direct_message'],
    function(bot,message) {
        bot.reply(message,'Don’t pretend you want to talk to me, I know you hate me.');
    }
);

function reverseString(str) {
    var newString = "";
    for (var i = str.length - 1; i >= 0; i--) {
        newString += str[i];
    }
    return newString;
}

controller.hears(
    ['!lyncon'],
    ['ambient'],
    function(bot,message) {
      request({uri: 'https://lyncon.se/dagens/lindholmen/', encoding: null} , function (err, response, body) {
                  console.log('error: ', err); // Handle the error if one occurred
                  console.log('statusCode: ', response && response.statusCode); // Check 200 or such

                  body = iconv.decode(body, 'iso-8859-1');

                  while(body.includes("</a></div>")) {
                    // ADD RESTAURANT HEADER
                    var pos1 = body.indexOf("</a></div>");
                    var restaurantHeader = body.slice(0, pos1);
                    body = body.slice(pos1 + 10, body.length - 1);
                    restaurantHeader = reverseString(restaurantHeader);
                    var pos2 = restaurantHeader.indexOf('>"');
                    restaurantHeader = restaurantHeader.slice(0, pos2);
                    restaurantHeader = reverseString(restaurantHeader);

                    // GET DISHES FOR RESTAURANT
                    var cutOff = body.indexOf("</a></div>");
                    var bodySection;
                    if (cutOff != null) {
                      bodySection = body.slice(0, cutOff);
                    } else {
                      bodySection = body;
                    }

                    // ITERATE THROUGH DISHES
                    while(bodySection.includes('<div class="d0">')) {
                      var mPos1 = bodySection.indexOf('<div class="d') + 16;
                      var mPos2 = bodySection.indexOf('</div>');
                      var menuItem = bodySection.slice(mPos1, mPos2);
                      menuItem = menuItem.replace("<strong>", "*");
                      menuItem = menuItem.replace("</strong>", "*");
                      menuItem = menuItem.replace("<i>", "_");
                      menuItem = menuItem.replace("</i>", "_");
                      var allMenuItems;
                      if (allMenuItems != null) {
                        allMenuItems = allMenuItems + "\n" + menuItem;
                      } else {
                        allMenuItems = menuItem + "\n";
                      }
                      bodySection = bodySection.slice(mPos2, bodySection.length - 1);
                    }

                    // ADD RESTAURANT AND ITS DISHES TO COMPLETE RESTAURANT LIST
                    var addedBody;
                    if (addedBody != null) {
                      addedBody = addedBody + "\n*" + restaurantHeader + "*\n" + allMenuItems;
                    } else {
                      addedBody = "\n*" + restaurantHeader + "*\n" + allMenuItems
                    }
                    allMenuItems = "";
                  }

                  var today = new Date();
                  var dd = today.getDate();
                  var mm = today.getMonth() + 1; //January is 0!
                  var yyyy = today.getFullYear();
                  if (dd < 10) {
                    dd = '0' + dd;
                  }
                  if (mm < 10) {
                    mm = '0' + mm;
                  }
                  today = mm + '/' + dd + '/' + yyyy;
                  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

                  console.log(addedBody);
                  bot.reply(message, 'This is the sort of thing you lifeforms enjoy, is it? The menu for ' + days[new Date().getDay()] + ' ' + today + ': ' + addedBody);
              });

    }
  );

  // FOR KEEPING SLACK APP ALIVE VIA UPTIME ROBOT
  expressApp.get('/', (req, res) => res.send('Hello World!'))

  expressApp.listen(4200, function () {
    console.log('The service is running!');
  });

/**
 * AN example of what could be:
 * Any un-handled direct mention gets a reaction and a pat response!
 */
//controller.on('direct_message,mention,direct_mention', function (bot, message) {
//    bot.api.reactions.add({
//        timestamp: message.ts,
//        channel: message.channel,
//        name: 'robot_face',
//    }, function (err) {
//        if (err) {
//            console.log(err)
//        }
//        bot.reply(message, 'I heard you loud and clear boss.');
//    });
//});
