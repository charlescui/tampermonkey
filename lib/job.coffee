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