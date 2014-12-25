# unibot-urllog

Simple UniBot plugin to log all URLs from configured channel.

## Install
To your UniBot application
```npm install git://github.com/UniBot/unibot-urllog --save```

And after that register new plugin on IRC channels what you need
```plugin [#channel] urllog```

ps. remember to restart your UnitBot.

## Configuration
You can configure this plugin adding ```urllog``` section to your UniBot ```config.js``` file. Example below

```
module.exports = { 
    ...
    plugins: {
        "urllog": {
            "dateFormat": "D.M.YYYY HH:mm:ss",
            "oldMessage": "${nick}: Old link!!1! ${existUrl.from} told this already ${formattedDate}"
        }
    }
};
```

###dateFormat###
This is a string that ```moment.js``` library ```format()``` function will take. This is used on ```formattedDate``` 
option on ```oldMessage``` string. Default value for this is ```D.M.YYYY HH:mm:ss``` 

###oldMessage###
A string that is said on channel if URL on message is an old one (someone else has said this before). Default value for
this is ```${nick}: Old link!!1! ${existUrl.from} told this already ${formattedDate}``` Within this message you can use 
following parameters:

```
url
nick
title
formattedDate
existUrl.url
existUrl.description
existUrl.title
existUrl.from
existUrl.timestamp
```
