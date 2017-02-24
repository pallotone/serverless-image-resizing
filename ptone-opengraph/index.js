'use strict';
let Base62 = require('base62'),
    unirest = require('unirest');
let BUCKET = process.env.BUCKET;
let URL = process.env.URL;

exports.handler = function (event, context) {
    let path = event.path;
    console.log(path);
    let match = path.match(/t\/(.*)/);

    let track62 = match[1];
    let trackId = Base62.decode(track62);
    let trackUrl = 'https://prod.api.pallotone.com/api/v1/tracks/' + trackId + '.json';
    unirest.get(trackUrl)
        .header('Content-Type', 'application/json')
        .end(function (response) {
            if (response.error) {
                let error = {
                    code: "NotFound",
                    message: "The requested resource was not found"
                };
                context.done(null, error);
            } else {
                let trackJson = response.body;
                let title = trackJson.name;
                let description = 'Listen to this Pallotone recording by ' + trackJson.author.name;
                let cover = trackJson.author.cover_url ? trackJson.author.cover_url + '/OG' : 'https://s3.amazonaws.com/pallotone/ptone_cover.png';
                let url = 'https://pto.ne/t/' + track62;
                let opengraphHtml = `<!doctype html>
                                <html lang="en">
                                    <head>
                                      <meta charset="UTF-8">
                                      <meta name="viewport" content="width=device-width">
                                      <meta name="description" content="Pallotone is a place for 4-track recordings. Create a musical world.">
                                      <meta name="keywords" content="pallotone">
                                      <meta name="author" content="Pallotone">
                                      <title>${title}</title>
                                      <!-- Open Graph -->
                                      <meta property="og:title" content="${title}">
                                      <meta property="og:description" content="${description}">
                                      <meta property="og:type" content="website">
                                      <meta property="og:site_name" content="Pallotone">
                                      <meta property="og:url" content="${url}">
                                      <meta property="og:image" content="${cover}">
                                      <!-- Twitter Card -->
                                      <meta name="twitter:card" content="summary">
                                      <meta name="twitter:site" content="@pallotone">
                                      <meta name="twitter:title" content="${title}">
                                      <meta name="twitter:description" content="${description}">
                                      <meta name="twitter:image" content="${cover}">
                                    </head>
                                    <body>
                                      <h1>Pallotone Web Player</h1>
                                      <h2>${title}</h2>
                                      <p>
                                        ${description}
                                      </p>
                                      <img src="${cover}"/>
                                    </body>
                                </html>`;
                context.succeed(opengraphHtml);
            }
        });
};
