var mongoose = require('mongoose');
var metaInspector = require('node-metainspector');
var moment = require('moment');

var Urls = new mongoose.Schema({
    channel: {
        type: String, // channel._id
        index: {
            unique: true,
            dropDups: false
        }
    },
    urls: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    }
});

var model = mongoose.model('Urls', Urls);

var plugin = function(channel, config) {
    var urls;

    model.findOne({channel: channel.id}, function(error, _urls) {
        if (error || !_urls) {
            urls = new model({
                channel: channel.id
            });

            urls.save();
        } else {
            urls = _urls;
        }
    });

    return {
        "^((?:(?:https?|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?!(?:10|127)(?:\\.\\d{1,3}){3})(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))(?::\\d{2,5})?(?:/\\S*)?)(\\s+(.*))?": function(from, matches) {
            var url = matches[1];
            var description = matches[3];
            var client = new metaInspector(url, {});

            model.findOne({channel: channel.id, 'urls.url': url}, function(error, _url) {
                if (error) {
                    channel.say('Oh noes, error: ' + error, from);
                } else if (_url) {
                    var date = moment(_url.urls[0].timestamp);
                    var message = from + ": Old link!!1! " + _url.urls[0].from + " told this already " + date.format('D.M.YYYY HH:mm:ss');

                    channel.say(message);
                } else {
                    client.on('fetch', function() {
                        var data = {
                            url: url,
                            description: description,
                            title: client.title,
                            from: from,
                            timestamp: Date.now()
                        };

                        urls.urls.push(data);
                        urls.markModified('urls');
                        urls.save();

                        channel.say(client.title);
                    });

                    client.on('error', function(error) {
                        channel.say('Oh noes, error: ' + error, from);
                    });

                    client.fetch();
                }
            });
        }
    };
};

module.exports = plugin;
