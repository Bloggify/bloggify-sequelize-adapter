"use strict";

const BloggifyAdapter = require("bloggify-adapter")
    , Bloggify = require("bloggify")
    , ul = require("ul")
    ;

module.exports = class BloggifyMarkdownAdapter extends BloggifyAdapter {

    getArticleById (id, cb) {
        Bloggify.models.Article.findOne({
            where: { id }
        }).then(article => {
            cb(null, article);
        }).catch(err => cb(err));
    }

    getArticleIds (cb) {
        Bloggify.models.Article.findAll({
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
            let pageNumber = options.page - 1;
            options.skip = pageNumber * options.per_page;
        }

        this.getArticleIds((err, allIds) => {
            let count = allIds.length
              , pageInfo = {
                  hasNewer: false
                , hasOlder: false
                , count: count
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

            Bloggify.models.Article.findAll({
                where: {
                    in: rangeIds
                }
            }).then(articles => {
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
        this.findArticleById(id, (err, article) => {
            if (err) { return cb(err); }
            article.update(Object.assign({
                title,
                content
            }, custom)).then(article => {
                cb(null, article);
            }).catch(err => cb(err));
        });
    }

    deleteArticle (id, cb) {
        fs.unlink(this.getArticlePath(id), cb);
        Bloggify.models.Article.destroy({
            where: { id }
        }).then(article => {
            cb(null, article);
        }).catch(err => cb(err));
    }
};
