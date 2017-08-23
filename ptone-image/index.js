'use strict';

let AWS = require('aws-sdk');
let S3 = new AWS.S3();
let Sharp = require('sharp');
let Canvas = require('canvas');
let request = require('request').defaults({encoding: null});
const fs = require('fs');
let path = require('path');
let appDir = path.dirname(require.main.filename);

let BUCKET = process.env.BUCKET;
let URL = process.env.URL;

exports.handler = function (event, context) {
    console.time('time');
    let key = event.queryStringParameters.key;
    console.log(key);
    let match = key.match(/(avatar|cover|artwork)\/(.*)\/(\d+)x(\d+)/);
    if (!match) {
        match = key.match(/(avatar|cover|artwork)\/(.*)\/(opengraph)/);
    }
    if (!match) {
        let error = {
            code: "NotFound",
            message: "The requested resource was not found"
        };
        context.done(null, error);
    }
    let originalKey = match[1] + '/' + match[2];

    let resize = () => {
        let width = parseInt(match[3], 10);
        let height = parseInt(match[4], 10);
        S3.getObject({Bucket: BUCKET, Key: originalKey}).promise()
            .then((data) => Sharp(data.Body)
                .resize(width, height)
                .toFormat('jpeg', {
                    quality: 75
                })
                .toBuffer()
            )
            .then((buffer) => S3.putObject({
                    Body: buffer,
                    Bucket: BUCKET,
                    ContentType: 'image/jpeg',
                    Key: key
                }).promise()
            )
            .then(() => context.succeed({
                    statusCode: '303',
                    headers: {'location': `${URL}/${key}`},
                    body: ''
                })
            )
            .catch((err) => context.fail(err));
    };

    let opengraphGenerate = () => {
        let Canvas = require('canvas'),
            Image = Canvas.Image,
            canvas = new Canvas(),
            ctx = canvas.getContext('2d');
        console.log('bout to read file');
        console.time('readCorner');
        fs.readFile('images/ptone_corner.png', function (err, corner) {
            console.timeEnd('readCorner');
            console.log('file redd');
            if (err) throw err;
            let cornerImg = new Image;
            cornerImg.src = corner;
            let coverImg = new Image;
            let coverUrl = URL + '/' + originalKey;
            console.log(coverUrl);
            console.time('readCover');
            S3.getObject({Bucket: BUCKET, Key: originalKey}).promise().then(
                (data) => {
                    console.timeEnd('readCover');
                    console.log('request done');
                    coverImg.src = data.Body;
                    let cornerSize = 200;
                    canvas.width = 955;
                    canvas.height = 500;
                    let newWidth = (canvas.height * coverImg.width) / coverImg.height;
                    let newHeight = (coverImg.height / coverImg.width) * canvas.width;
                    let coverImgX = (canvas.width - newWidth ) * 0.5;
                    let coverImgY = (canvas.height - newHeight ) * 0.5;
                    if (newWidth < canvas.width) {
                        coverImgX = 0;
                        newWidth = canvas.width;
                    } else {
                        coverImgY = 0;
                        newHeight = canvas.height;
                    }
                    console.log(coverImgX, newWidth);
                    ctx.drawImage(coverImg, coverImgX, coverImgY, newWidth, newHeight);
                    ctx.drawImage(cornerImg, canvas.width - cornerSize, canvas.height - cornerSize, cornerSize, cornerSize);
                    S3.putObject({
                        Body: canvas.toBuffer(),
                        Bucket: BUCKET,
                        ContentType: 'image/jpeg',
                        Key: key
                    }).promise()
                        .then(() => {
                            //request.post(`https://graph.facebook.com/v2.8/?scrape=true&id=https://pallotone.com/t/${}`);
                            console.timeEnd('time');
                            context.succeed({
                                statusCode: '303',
                                headers: {'location': `${URL}/${key}`},
                                body: ''
                            });
                        })
                        .catch((err) => context.fail(err));
                });
        });
    };

    if (match[3] === 'opengraph') {
        opengraphGenerate();
    } else {
        resize();
    }
};
