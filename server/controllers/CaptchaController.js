var visualCaptcha,
    allowOrigin = '*';

module.exports =  {

    _options: function( req, res, next ) {
        res.header( 'Access-Control-Allow-Origin', allowOrigin );
        res.header( 'Access-Control-Allow-Methods', 'POST' );
        res.header( 'Access-Control-Allow-Headers', 'accept, content-type' );
        res.header( 'Access-Control-Allow-Credentials', true );
        res.send( 200 );
    },

    _getAudio: function( req, res, next ) {
        // Default file type is mp3, but we need to support ogg as well
        if ( req.params.type !== 'ogg' ) {
            req.params.type = 'mp3';
        }

        visualCaptcha.streamAudio( res, req.params.type );
    },

    _getImage: function( req, res, next ) {
        var isRetina = false;

        // Default is non-retina
        if ( req.query.retina ) {
            isRetina = true;
        }

        visualCaptcha.streamImage( req.params.index, res, isRetina );
    },

    _start: function( req, res, next ) {

        // After initializing visualCaptcha, we only need to generate new options
        if ( ! visualCaptcha ) {
            visualCaptcha = require( 'visualcaptcha' )( req.session, req.query.namespace );
        }

        // Generation visualCaptcha data
        visualCaptcha.generate( req.params.howmany );


        // We have to send the frontend data to use on POST.
        res.status(200).send( visualCaptcha.getFrontendData() );
    },

    _trySubmission: function( req, res, next ) {
        var namespace = req.query.namespace,
            frontendData,
            queryParams = [],
            imageAnswer,
            audioAnswer,
            responseStatus,
            status,
            result = {};

        frontendData = visualCaptcha.getFrontendData();

        // Add namespace to result, if present
        if ( namespace && namespace.length !== 0 ) {
            result.namespace = namespace;
        }

        // It's not impossible this method is called before visualCaptcha is initialized,
        // so we have to send a 404
        if ( typeof frontendData === 'undefined' ) {
            result.status = 'noCaptcha';

            responseStatus = 404;
        } else {
            // If an image field name was submitted, try to validate it
            if ( ( imageAnswer = req.body[ frontendData.imageFieldName ] ) ) {
                result.type = 'image';
                if ( visualCaptcha.validateImage( imageAnswer ) ) {
                    result.status = 'valid';
                    responseStatus = 200;
                } else {
                    result.status = 'invalid';
                    responseStatus = 403;
                }
            } else if ( ( audioAnswer = req.body[ frontendData.audioFieldName ] ) ) {
                // If an audio field name was submitted, try to validate it
                result.type = 'audio';
                // We set lowercase to allow case-insensitivity, but it's actually optional
                if ( visualCaptcha.validateAudio( audioAnswer.toLowerCase() ) ) {
                    result.status = 'valid';
                    responseStatus = 200;
                } else {
                    result.status = 'invalid';
                    responseStatus = 403;
                }
            } else {
                result.status = 'failedPost';
                responseStatus = 500;
            }
        }

        // CORS fix
        res.header( 'Access-Control-Allow-Origin', allowOrigin );
        res.header( 'Access-Control-Allow-Credentials', true );

        if(responseStatus == 200) {

            next();
        }
            else {
                res.status(responseStatus).send({
                    captcha: result
                });
            }
    }

};