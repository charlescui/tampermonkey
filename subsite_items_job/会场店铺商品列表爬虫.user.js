// ==UserScript==
// @name         会场店铺商品列表爬虫
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  天猫会场页商品列表爬虫，爬取页面的商品ID和链接
// @icon         https://img.alicdn.com/tps/i2/TB1KTLrGVXXXXaeXFXXfLpBIVXX-144-100.gif
// @author       zheng.cuizhgmail.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @require      http://coffeescript.org/extras/coffee-script.js
// @require      https://openuserjs.org/src/libs/zheng.cuizhgmail.com/job.min.js
// @match        https://pages.tmall.com/*
// @require      https://m.alicdn.com/cuizheng/node_modules/xpath-dom/dist/xpath-dom.min.js
// @require      https://m.alicdn.com/cuizheng/node_modules/file-saver/FileSaver-min.js
// @updateURL    https://openuserjs.org/meta/zheng.cuizhgmail.com/会场店铺商品列表爬虫.meta.js
// ==/UserScript==
/* jshint ignore:start */
var inline_src = (<><![CDATA[

#############################################################################
# 业务逻辑
#############################################################################

class SubsiteItemListJob extends Job
    constructor: (@xpath) ->
        @title = "店铺分会场数据爬虫"        
        super(@title)
    @getURLParameter: (name, url) ->
        if url.indexOf("//") == 0
            url = "http:#{url}"
        uri = new URL(url)
        uri.searchParams.get(name)
    start: () ->
        console.log("XPATH: "+@xpath)
        @line = 0
        @data = ["#,title,price,tid,url,img\n"]
        items = @xpath.findAll('//a[@class="mui-chaoshi-item-column-inner"]')
        for item in items
            title = @xpath.find('div[@class="item-main"]/div[@class="item-title"]', item)
            price = @xpath.find('div[@class="item-main"]/div[@class="bottom-area"]/div[@class="price-box"]/p[@class="price"]', item)
            # 淘宝页面写的就是有空格
            # 注意item-img 别去掉空格!!!
            img = @xpath.find('div[@class="img-wrapper"]/img[@class="item-img "]', item)
            # 图片都是异步加载的
            img_src = img.getAttribute('data-ks-lazyload')
            # 用户看了之后就没有懒加载属性了
            # 要通过src读取已经加载的地址
            if !img_src
                img_src = img.getAttribute('src')
            
            href = item.getAttribute('href')
            tid = SubsiteItemListJob.getURLParameter("id", href)
            @data.push("#{@line}, #{title.textContent.replace(/\s+/, "")}, #{price.textContent.replace(/\s+/, "")}, #{tid.trim()}, http:#{href.trim()}, http:#{img_src.trim()}\n")
            @line += 1
            console.log(item)
# 
Worker.work(new SubsiteItemListJob(xpath))

]]></>).toString();
var compiled = this.CoffeeScript.compile(inline_src);
eval(compiled);
/* jshint ignore:end */