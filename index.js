var format = require('util').format,
    stream = require('stream'),

    cheerio = require('cheerio'),
    lazystream = require('lazystream'),
    needle = require('needle');

var URL = 'http://mp3skull.com/search_db.php?q=%s&fckh=%s';

var search;

function parseDuration(time) {
    var seconds;

    time = time.split(':');

    if (time.length !== 2) {
        return 0;
    }

    seconds = (+time[0] || 0) * 60;
    seconds += +time[1] || 0;

    return seconds;
}

function getSession(options, done) {
    // It's 4kb vs 16kb using an invalid search instead of the homepage to fetch
    // the session identifier.
    needle.get(format(URL, 'x'), options, function (err, res, body) {
        var $, session;

        if (err) {
            return done(err);
        }

        try {
            $ = cheerio.load(body);
            session = $('input[name="fckh"]').attr('value');
        } catch (e) {
            return done(e);
        }

        if (!session) {
            return done(new Error('No session found.'));
        }

        done(null, session);
    });
}

search = (function () {
    var session;

    return function (terms, options, done) {
        var url;

        if (!done) {
            done = options;
            options = {};
        }

        if (!session) {
            return getSession(options, function (err, newSession) {
                if (err) {
                    return done(err);
                }

                session = newSession;

                search(terms, options, done);
            });
        }

        url = format(URL, terms, session);

        needle.get(url, options, function (err, res, body) {
            var $, tracks;

            if (err) {
                return done(err);
            }

            if (/session has expired/i.test(body)) {
                session = undefined;
                return search(terms, options, done);
            }

            try {
                $ = cheerio.load(body);
            } catch (e) {
                return done(e);
            }

            tracks = [];

            $('#song_html').each(function () {
                var track = ($('#right_song b', this).text() || '').trim(),
                    direct = $('#right_song a', this).attr('href'),
                    meta = ($('.left', this).html() || '').trim(),

                    bitrate, duration, size;

                try {
                    meta = meta.split('\n')[1].trim().split('<br>');

                    meta.forEach(function (item) {
                        if (item.indexOf(':') > -1) {
                            duration = parseDuration(item);
                        } else if (item.indexOf('kbps') > -1) {
                            bitrate = +item.slice(0, -4);
                        } else if (item.indexOf('mb') > -1) {
                            size = +item.slice(0, -3);
                            size = Math.ceil(size * 1024);
                        }
                    });
                } catch (e) {
                    // none of that information was required so we don't care if
                    // it isn't available.
                }

                tracks.push({
                    track: track,
                    direct: direct,
                    bitrate: bitrate,
                    duration: duration,
                    size: size,
                    song: new lazystream.Readable(function () {
                        var out;

                        if (!direct) {
                            out = new stream.PassThrough();

                            process.nextTick(function () {
                                out.emit(
                                    'error',
                                    new Error('No direct link found.')
                                );
                            });

                            return out;
                        }

                        return needle.get(direct, options);
                    })
                });
            });

            done(null, tracks);
        });
    };
}());

module.exports = search;
