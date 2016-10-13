// ==UserScript==
// @name         会场店铺商品列表爬虫
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  天猫会场页商品列表爬虫，爬取页面的商品ID和链接
// @icon         https://img.alicdn.com/tps/i2/TB1KTLrGVXXXXaeXFXXfLpBIVXX-144-100.gif
// @author       zheng.cuizhgmail.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        unsafeWindow
// @require      http://coffeescript.org/extras/coffee-script.js
// @match        https://*/*
// @require      https://m.alicdn.com/cuizheng/node_modules/xpath-dom/dist/xpath-dom.min.js
// @require      https://m.alicdn.com/cuizheng/node_modules/file-saver/FileSaver-min.js
// @updateURL    https://openuserjs.org/meta/zheng.cuizhgmail.com/会场店铺商品列表爬虫.meta.js
// ==/UserScript==
/* jshint ignore:start */
var inline_src = (<><![CDATA[

# JS动态生成数据文件并且下载的库
# https://github.com/eligrey/FileSaver.js/
# [DEBUG] file in CDN: http://m.alicdn.com/cuizheng/node_modules/file-saver/FileSaver.js
# [DEBUG] file in CDN: http://m.alicdn.com/cuizheng/node_modules/file-saver/FileSaver-min.js

# XPATH的能力是基于
# https://www.npmjs.com/package/xpath-dom
# [DEBUG] file in CDN: http://m.alicdn.com/cuizheng/node_modules/xpath-dom/dist/xpath-dom.min-min.js
# [DEBUG] file in CDN: http://m.alicdn.com/cuizheng/node_modules/xpath-dom/dist/xpath-dom.min.js

# 业务代码写在Job模型中
class Job
    @JOBS: []
    @JOBSOBJ: {}
    constructor: (@title) ->
        # @data变量用来存储测试结果
        # 需要下载的数据存在该变量数组中
        # 测试结束按SSS的时候会下载下来
        @data = []
    start: () ->
        console.log("Started")
        console.log("Data size #{@data.length}, content: \n#{@data}")
    stop: () ->
        console.log("Stoped")
        if @data.length > 0
            console.log("download data #{@data.length} lines")
            blob = new Blob(@data, {type: "text/plain;charset=utf-8"});
            saveAs(blob, "ttt-data.csv");
            console.log("clear data buffer.")
            @data = []

class Worker
    @RUNNINGKEY = "running_key"
    constructor: (jobs) ->
        # 整理任务数组
        for job in jobs
            Job.JOBS.push(job)
            Job.JOBSOBJ[job.id] = job
        
    @work: (jobs...) ->
        instance = new Worker(jobs)
        instance.work()
    work: ->
        @kt = new KeyTrigger(@)
        # 监听按键
        document.addEventListener("keydown", @kt.keydown)
    start: ->
        console.log("Working")
        # 如果没有任务执行
        # 则询问用户找到一个任务
        unless @job
            content = "Press JOB Number to Start:\n"
            for i in [0..Job.JOBS.length-1]
                job = Job.JOBS[i]
                content += "#{i}. #{job.title}"
                content += "\n"
            
            idx = prompt(content, "0")
            @job = Job.JOBS[idx] if idx
        if @job
            @job.start()
            GM_notification("任务执行完毕")
        else
            GM_notification("未找到可执行的任务")
    stop: ->
        if @job
            GM_notification("任务执行完毕，成功分析#{@job.data.length}条数据")
            @job.stop()
            @job = null
        else
            GM_notification("无任务等待结束")

# 启动任务
#   连续按三个T
# 结束任务
#   连续按三个S
class KeyTrigger
    constructor: (@worker) ->
        @keys = []
        @status = ""
    dispatch: (rk) ->
        @keys.push rk
        if @check()
            if @status == "on"
                @keys = []
                @worker.start()
                @status = ""
            else if @status == "off"
                @keys = []
                @worker.stop()
        else
            console.log("not valid key")
    check: ->
        last_3_keys = @keys.slice(-3)
        if @keys.length >= 3 and ("#{last_3_keys}" is "#{['T', 'T', 'T']}")
            @status = "on"
            return true
        else if @keys.length >= 3 and "#{last_3_keys}" is "#{['S', 'S', 'S']}"
            @status = "off"
            return true
        else
            console.info "check False! TTT:"+last_3_keys + "   keys: "+@keys
            return false
    keydown: (e) =>
        keycode = e.which;
        realkey = String.fromCharCode(e.which);
        @dispatch(realkey)

class Logger
    constructor: () ->
        @logContent = document.createElement('div')
        @logContent.id = "logContent"
        @logContent.style.cssText =
            "position:fixed;color:black;background-color:#fff;left:10px;bottom:10px;z-index:99999;font-size:24px;max-height:800px;_height:expression((document.documentElement.clientHeight||document.body.clientHeight)<800?'800px':''); overflow:hidden;"
        document.body.appendChild(@logContent)
        @logContent.setAttribute("readonly", "false")
        @logLines = 0
    info: (str) -> 
        logEle = document.createElement('div')
     
        myDate = new Date()

        if myDate.toLocaleTimeString
            mytime = myDate.toLocaleTimeString()
        else 
            mytime = myDate.getHours() + ":" + myDate.getMinutes() + ":" + myDate.getSeconds()
     
        @logLines++
        logEle.innerHTML = @logLines + " " + mytime + " " + str
     
        @logContent.appendChild(logEle)
        while @logContent.childElementCount > 100
            @logContent.innerHTML = ""
        @logContent.scrollTop = @logContent.scrollHeight

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
        @getElements(true)
    # 根据页面判断执行什么爬虫策略
    getElements: (run) ->
        href = unsafeWindow.location.href
        if href.indexOf("pages.tmall.com/wow/huanxin/act/mustbuy") >= 0
            if run
                @getBiQiangElements()
            else
                GM_notification("当前页面支持爬虫分析")
            
        else if href.indexOf("miao.tmall.com") >= 0
            if run
                @getMiaoElements()
            else
                GM_notification("当前页面支持爬虫分析")
        else
            console.log("当前页面不支持爬虫分析，无法获取商品数据")
            # GM_notification("当前页面不支持爬虫分析，无法获取商品数据")
    # 必抢
    getBiQiangElements: () ->
        # https://pages.tmall.com/wow/huanxin/act/mustbuy
        items = @xpath.findAll('//div[@class="good-item "]/a[@class="goods-content"]')
        debugger
        for item in items
            title = @xpath.find('div[@class="info"]/div[@class="desc"]', item)
            price = @xpath.find('div[@class="info"]/div[@class="price"]/div[@class="current-price"]/span[@class="int"]', item)
            # 淘宝页面写的就是有空格
            # 注意item-img 别去掉空格!!!
            img = @xpath.find('div[@class="img-wrapper"]/img[@class="lazyImg"]', item)
            # 图片都是异步加载的
            img_src = img.getAttribute('data-ks-lazyload')
            # 用户看了之后就没有懒加载属性了
            # 要通过src读取已经加载的地址
            if !img_src
                img_src = img.getAttribute('src')
            
            href = item.getAttribute('href')
            tid = SubsiteItemListJob.getURLParameter("id", href)

            obj = 
                href: href
                tid: tid
                title: title
                price: price
                img_src: img_src

            @collectData(obj)
    # 喵生鲜
    getMiaoElements: () ->
        # https://miao.tmall.com/
        items = @xpath.findAll('//div[@class="itemOuter"]/div[@class="itemWrapper"]/a')
        for item in items
            title = @xpath.find('div[@class="item-info"]/h6/span', item)
            price = @xpath.find('div[@class="item-info"]/div[@class="priceSection"]/div[@class="priceNumber"]/span[@class="mainPrice"]', item)
            # 淘宝页面写的就是有空格
            # 注意item-img 别去掉空格!!!
            img = @xpath.find('img', item)
            # 图片都是异步加载的
            img_src = img.getAttribute('data-ks-lazyload')
            # 用户看了之后就没有懒加载属性了
            # 要通过src读取已经加载的地址
            if !img_src
                img_src = img.getAttribute('src')
            
            href = item.getAttribute('href')
            tid = SubsiteItemListJob.getURLParameter("id", href)

            obj = 
                href: href
                tid: tid
                title: title
                price: price
                img_src: img_src

            @collectData(obj)
    # obj => {
    #     href: "",
    #     tid: "",
    #     title: "",
    #     price: "",
    #     img_src: ""
    # }
    collectData:(obj) ->
        if obj.href.indexOf("http") < 0
            href = "http:#{obj.href.trim()}"
        else
            href = obj.href
        tid = SubsiteItemListJob.getURLParameter("id", href).trim()
        title = obj.title.textContent.replace(/\s+/, "")
        price = obj.price.textContent.replace(/\s+/, "")
        if obj.img_src.indexOf("http") < 0
            img_src = "http:#{obj.img_src.trim()}"
        else
            img_src = obj.img_src

        @data.push("#{@line}, #{title}, #{price}, #{tid}, #{href}, #{img_src}\n")
        @line += 1
        console.log(obj)
# 
job = new SubsiteItemListJob(xpath)
# 先提醒用户是否支持网页爬虫
job.getElements(false)
Worker.work(job)

]]></>).toString();
var compiled = this.CoffeeScript.compile(inline_src);
eval(compiled);
/* jshint ignore:end */