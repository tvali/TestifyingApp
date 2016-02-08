nodemailer = require 'nodemailer'
fs = require 'fs'
path = require 'path'
hogan = require 'hogan.js'
{EventEmitter} = require 'events'

class Mumail extends EventEmitter

    cachedTemplates = {}

    constructor: ({@templatePath, @from, @smtp})->
        if @smtp
            @transport = nodemailer.createTransport require('nodemailer-smtp-transport') @smtp
        else
            @transport = nodemailer.createTransport()

    send: ({from,to,cc,subject,template,data})->

        from = from ? @from

        opts =
            from: from
            to: to
            subject: subject

        if cc
            opts.cc = cc

        @render template, data, (html)=>
            @sendMail opts, html


    sendMail: (opts, html)->
        opts.html = html
        @transport.sendMail opts, (error, response)=>
            if error
                @emit 'error', error
            else
                @emit 'done', response

    render: (templateName, data, callback)->

        htmlPath = path.join @templatePath,"#{templateName}.html"
        textPath = path.join @templatePath,"#{templateName}.txt"

        if cachedTemplates[htmlPath]
            callback cachedTemplates[htmlPath].render data
        else
            fs.readFile htmlPath, 'utf-8', (err, html)=>
                if err
                    @emit 'error', err
                else
                    cachedTemplates[htmlPath] = hogan.compile html
                    callback cachedTemplates[htmlPath].render data

module.exports = Mumail
