/**
 * Plugin dependencies.
 *
 * @type {exports}
 */
var metaInspector = require('node-metainspector');
var moment = require('moment');
var _ = require('lodash');

/**
 * URL log plugin for UniBot
 *
 * @param  {Object} options Plugin options object, description below.
 *   db: {mongoose} the mongodb connection
 *   bot: {irc} the irc bot
 *   web: {connect} a connect + connect-rest webserver
 *   config: {object} UniBot configuration
 *
 * @return  {Function}  Init function to access shared resources
 */
module.exports = function init(options) {
    var mongoose = options.db;
    var bot = options.bot;
    var webserver = options.web;
    var config = options.config;

    // Specify database schema for plugin
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

    /**
     * Default plugin configuration. These can be override on your UniBot config.js file
     *
     * @type    {{
     *              dateFormat: string,
     *              oldMessage: string
     *          }}
     */
    var pluginConfig = {
        "dateFormat": "D.M.YYYY HH:mm:ss",
        "oldMessage": "${nick}: Old link!!1! ${existUrl.from} told this already ${formattedDate}"
    };

    // Merge configuration for plugin
    if (!_.isUndefined(config.plugins.urllog) && _.isObject(config.plugins.urllog)) {
        pluginConfig = _.merge(pluginConfig, config.plugins.urllog);
    }

    /**
     * Getter method for plugin template for UniBot frontend.
     *
     * @param   {Request}   req     Request object
     * @param   {Response}  res     Response object
     * @param   {Function}  next    Callback function
     */
    webserver.get('/urllog', function(req, res, next) {
        res.sendFile(__dirname + '/index.html');
    });

    /**
     * Getter method for URL log data for UniBot frontend.
     *
     * @param   {Request}   req     Request object
     * @param   {Response}  res     Response object
     * @param   {Function}  next    Callback function
     */
    webserver.get('/urllog/:channel', function(req, res, next) {
        model.findOne({ channel: req.params.channel }, function(err, logs) {
            res.send(err || logs);
        });
    });

    /**
     * Actual UniBot URL log plugin. This will match all URLs from IRC channel and stores those to database for later
     * usage. Plugin specified regex will match "any real url" on channel messages.
     *
     * If URL has been already stored to database plugin will inform that user about that.
     */
    return function plugin(channel){
        var urls = [];

        // Initial of URL log store
        model.findOne({ channel: channel.id }, function(err, _urls_) {
            if (err || !_urls_) {
                urls = new model({
                    channel: channel.id
                });

                urls.save();
            } else {
                urls = _urls_;
            }
        });

        return {
            "[.*]?((?:(?:https?|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?!(?:10|127)(?:\\.\\d{1,3}){3})(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))(?::\\d{2,5})?(?:/\\S*)?)[\\s+]?(.*)?": function(from, matches) {
                var url = matches[1];
                var description = matches[2];
                var client = new metaInspector(url, {});

                model.findOne({channel: channel.id, 'urls.url': url}, function(error, _url) {
                    if (error) {
                        channel.say('Oh noes, error: ' + error, from);
                    } else if (_url) {
                        // Specify used template variables
                        var templateVars = {
                            url: url,
                            nick: from,
                            title: client.title,
                            formattedDate: moment(_url.urls[0].timestamp).format(pluginConfig.dateFormat),
                            existUrl: _url.urls[0]
                        };

                        if (_url.from !== from) {
                            channel.say(_.template(pluginConfig.oldMessage, templateVars));
                        }
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

                            // If URL has "real" title say that on channel
                            if (client.title) {
                                channel.say(client.title);
                            }
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
};
