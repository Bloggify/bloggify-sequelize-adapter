"use strict";

const BloggifyAdapter = require("bloggify-adapter")
    , ul = require("ul")
    ;

let Bloggify = null;

module.exports = class BloggifyMarkdownAdapter extends BloggifyAdapter {

    constructor (_Bloggify) {
        super(_Bloggify);
        Bloggify = _Bloggify;
    }

    getArticleById (id, opts, cb) {
        if (typeof opts === "function") {
            cb = opts;
            opts = {};
        }
        const query = Object.assign(opts, {
            where: { id }
        });
        Bloggify.models.Article.findOne(query).then(article => {
            cb(null, article);
        }).catch(err => cb(err));
    }

    getArticleIds (where, cb) {

        if (typeof where === "function") {
            cb = where;
            where = {};
        }

        Bloggify.models.Article.findAll({
            where,
            attributes: {
                include: ["id"]
            }
        }).then(articles => {
            cb(null, articles.map(c => c.id));
        }).catch(err => cb(err));
    }

    getArticles (options, cb) {

        if (typeof options === "function") {
            cb = options;
            options = {};
        }

        options = ul.merge(options, {
            skip: 0
          , per_page: 3
        });

        if (options.page) {
            options.page = +options.page;
            let pageNumber = options.page - 1;
            options.skip = pageNumber * options.per_page;
        }

        this.getArticleIds(options.where, (err, allIds) => {
            if (err) { return cb(err); }
            let count = allIds.length
              , pageInfo = {
                  hasNewer: false
                , hasOlder: false
                , count: count
                , pageCount: Math.ceil(count / options.per_page)
                , page: options.page || 1
                }
              ;

            let rangeIds = [];
            if (options.ids) {
                rangeIds = options.ids;
            } else {
                rangeIds = allIds.slice(-options.page * options.per_page, -options.skip || undefined).reverse()
                if (rangeIds.length < rangeIds.length) {
                    pageInfo.hasNewer = rangeIds[rangeIds.length - 1] !== allIds[allIds.length - 1];
                    pageInfo.hasOlder = rangeIds[0] !== allIds[0];
                }
            }

            if (!rangeIds.length) {
                return cb(null, [], pageInfo);
            }

            const query = Object.assign(options.query || {}, {
                where: {
                    id: rangeIds
                },
                limit: options.per_page,
                order: [
                    ["created_at", "DESC"]
                ]
            });
            Bloggify.models.Article.findAll(query).then(articles => {
                articles = articles.filter(Boolean);
                if (options.filter) {
                    articles = articles.filter(options.filter);
                }
                cb(null, articles, pageInfo);
            }).catch(err => cb(err));
        });
    }

    createArticle (title, content, custom, cb) {
        Bloggify.models.Article.create(Object.assign({
            title,
            content
        }, custom)).then(article => {
            cb(null, article);
        }).catch(err => cb(err));
    }

    saveArticle (id, title, content, custom, cb) {
        this.getArticleById(id, (err, article) => {
            if (err) { return cb(err); }
            if (!article) {
                return cb(null, null);
            }
            article.update(Object.assign({
                title,
                content
            }, custom)).then(article => {
                cb(null, article);
            }).catch(err => cb(err));
        });
    }

    deleteArticle (id, cb) {
        Bloggify.models.Article.destroy({
            where: { id }
        }).then(article => {
            cb(null, article);
        }).catch(err => cb(err));
    }
};
