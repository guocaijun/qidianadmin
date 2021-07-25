//起点外卖后台
//1.引入express
let express =require("express")
//引入body-parse
let bodyparser=require("body-parser")
//引入mysql
let mysql=require("mysql");
//引入session
let session=require("express-session");
//引入formidable
let formidable=require("formidable")
//引入co
let co=require("co");
//引入阿里oss
let OSS=require("ali-oss")
let fs=require("fs")
//2创建服务
let app=express();
app.use(bodyparser.urlencoded({extended:false}));//设置请求报文主体的编码类型=》不用编码
app.use(bodyparser.json());//设置请求报文主体类型
//设置为中间件
app.use(session({

    secret: 'keyboard cat',//参与加密的字符串（又称签名）

    saveUninitialized: false, //是否为每次请求都设置一个cookie用来存储session的id

    resave: true ,//是否在每次请求时重新保存session

    cookie:{maxAge: 1200000,//session的过期时间,单位为毫秒   把session信息存储在cookie

    }

}))
//3.读取静态资源
//引入jade
app.use(express.static("node_modules"))
app.use(express.static("public"))
//设置模板引擎类型
app.set("view engine","jade")
//设置模板存放的目录
app.set("views","./views")
//配置数据库
let connection=mysql.createConnection({
    'host':'localhost',//主机
    'user':'root',//用户名
    'password':'',//密码
    'database':'qidians'//操作的数据库
})
//连接数据库
connection.connect();
//4.设置路由
//加载登录的模板
app.get("/login",function(req,res){
    res.render("Login/login")
})
//执行登录
app.post("/dologin",function(req,res){
    //获取登录的用户名和密码
    let name=req.body.name;
    let password=req.body.password;
    //检测登录用户名
    let sql="select * from admin_users where name='"+name+"'";
    // console.log(sql);
    // return;
    connection.query(sql,(error,results,fields)=>{
        // console.log(results);
        //如果用户名有误
        if(results.length<=0){
            //给提示信息
            //在返回响应头的时候设置编码
            res.setHeader('content-type','text/html;charset=utf-8')
            res.write(`<h1>用户名不存在</h1>!<script>setTimeout(function(){location.href="/login"},3000)</script>`)
            res.end();
        }else{
            //在返回响应头的时候设置编码
            // res.setHeader('content-type','text/html;charset=utf-8')
            // res.write('用户名ok')
            // res.end();
            //检测密码 对比 输入密码和查询的密码
            if(password==results[0].password){
                res.setHeader('content-type','text/html;charset=utf-8')
                //设置session
                //把登录的用户名存储在session
                req.session.loginname=name;
                res.write(`<h1>登录成功</h1>!<script>setTimeout(function(){location.href="/adminindex"},3000)</script>`)
                res.end();
            }else{
                res.setHeader('content-type','text/html;charset=utf-8')
                res.write(`<h1>密码错误</h1>!<script>setTimeout(function(){location.href="/login"},3000)</script>`)
                res.end();
            }

        }
       
    })
})
//方法判断下用户是否登录
function checkislogin(req,res,next){
    if(!req.session.loginname){
        res.setHeader('content-type','text/html;charset=utf-8')
        res.write(`<h1>请先登录</h1>!<script>setTimeout(function(){location.href="/login"},3000)</script>`)
        res.end();
    }else{
        next();//执行下一个请求=》用户已经登录了
    }
}
//加载后台首页
app.get("/adminindex",checkislogin,function(req,res){
    //分配模块类型和销量
    let xAxis=["管理员","用户","入驻商家","商家食品","订单"]
    let series=["10","20","40","200","500"]
   //加载模板
   res.render("AdminIndex/adminindex",{xAxis:xAxis,series:series,islogin:req.session.loginname});
})
//加载后台管理员
app.get("/adminuser",checkislogin,function(req,res){
    //查询数据
    let sql="select * from admin_users";
    //执行sql
    connection.query(sql,(error,results,fields)=>{
        if(error) throw error;
        // console.log(results);return;
        //加载模板
        res.render("AdminUser/adminuser",{data:results,islogin:req.session.loginname});
    })
    
 })
 //加载管理员添加模板
 app.get("/adminadd",checkislogin,function(req,res){
    res.render("AdminUser/adminadd",{islogin:req.session.loginname});
 })
 //执行添加
app.post("/doadminadd",checkislogin,function(req,res){
    //获取表单数据
    // console.log(req.body);
    let name=req.body.name
    let password=req.body.password;

    //数据入库
    let sql="insert into admin_users(name,password)values('"+name+"','"+password+"')";
    // console.log(sql);return;
    //执行sql语句
    connection.query(sql,(error,results,fields)=>{
        if(error) throw error;
        // console.log(results);
        // res.end();
        //条件
        if(results.affectedRows>0){
            res.redirect("/adminuser")
        }
        
    })
})
//管理员删除
app.get("/adminuserdel",checkislogin,function(req,res){
    //获取删除数据的序号id
    let id=req.query.id;
    // console.log(id);res.end();
    //sql
    let sql="delete from admin_users where id="+id;
    //执行sql
    connection.query(sql,(error,results,fields)=>{
        if(error) throw error;
        //条件
        if(results.affectedRows>0){
            res.redirect("/adminuser")
        }
    })
})
//加载管理员修改模板
app.get("/adminuseredit",checkislogin,function(req,res){
    //获取id
    let id=req.query.id;
    //操作数据库获取需要修改的数据
    let sql="select * from admin_users where id="+id;
    //执行sql语句
    connection.query(sql,function(error,results,fields){
        if(error) throw error;
        // console.log(results[0])
        // res.end();
        //加载修改模板 分配
        res.render("AdminUser/adminuseredit",{data:results[0]})
    })

})

//执行管理员修改
app.post("/doadminuseredit",checkislogin,function(req,res){
    let param=req.body;
    // console.log(param)
    let name=param.name;
    let password=param.password;
    let id=param.id;
    let sql="update admin_users set name='"+name+"',password='"+password+"' where id="+id;
    //执行sql
    connection.query(sql,(error,results,fields)=>{
        if(error) throw error
        // console.log(results);
        // res.end();
        if(results.affectedRows>0){
            res.redirect("/adminuser")
        }
    })
})
//加载用户列表
app.get("/adminusers",checkislogin,function(req,res){
    let sql="select * from users";
    connection.query(sql,(error,results,fields)=>{
        //加载模板
        res.render("AdminUsers/adminusers",{data:results,islogin:req.session.loginname});
    })
    
 })

 //搜索用户
 app.get("/adminuserssearch",checkislogin,function(req,res){
   //搜索的关键词获取到
   let keyword=req.query.keyword;
   //sql语句
   let sql="select * from users where name like '%"+keyword+"%'"
   //执行sql
   connection.query(sql,(error,results,fields)=>{
       //加载模板
       res.render("AdminUsers/adminusers",{data:results,islogin:req.session.loginname});
   })
 })

 //用户详情模块
 app.get("/adminusersinfo",checkislogin,function(req,res){
    //获取用户id
    let id=req.query.id;
    //sql语句
    let sql="select * from users_info where user_id="+id;
    //执行sql
    connection.query(sql,(error,results,fields)=>{
        res.render("AdminUsers/adminusersinfo",{data:results[0],islogin:req.session.loginname})
    })
 })

 //用户收货地址
 app.get("/adminusersaddress",checkislogin,function(req,res){
     //获取用户name
     let name=req.query.name;
     //sql语句
     let sql="select * from address where username='"+name+"'";
    //  console.log(sql);return;
     //执行sql
     connection.query(sql,(error,results,fields)=>{
         console.log(results)
         res.render("AdminUsers/adminusersaddress",{data:results,islogin:req.session.loginname})
     })
 })
 //商家添加
 app.get("/adminshoplistadd",checkislogin,function(req,res){
    res.render("AdminShoplist/adminshoplistadd",{islogin:req.session.loginname})
 })
 //设置阿里oss
var client = new OSS({

      region: 'oss-cn-beijing',//地域
    
      accessKeyId: 'LTAIg7Z0AseJmEDD',//keyid
    
      accessKeySecret: 'VM11mrVorQd0dUxZjhbOQrbaOusKFk',//密钥
    
      bucket: 'ygjy007'//仓库名字
    
    });
    
    var ali_oss = {
    
        bucket: 'ygjy007',//仓库名字
    
        endPoint: 'oss-cn-beijing.aliyuncs.com',//物理服务器
    
    }
 //执行添加
 app.post("/doadminshoplistadd",checkislogin,function(req,res){
    //实例化formidable
    let form=new formidable.IncomingForm();
    //设置上传文件后缀及路径
    form.keepExtensions=true;
    form.uploadDir="./uploads";
    //表单解析
    form.parse(req,function(err,fields,files){
        //获取参数
        let name=fields.name;
        let content=fields.content;
        let fee=fields.fee;
        // console.log(files);return;
        let pics=files.pic.path;
        let pic=pics.slice(8)
        let filePath=files.pic.path;
        // console.log(pic);
        // console.log(filePath);return;
        // res.end();
        //阿里oss执行文件上传
        co(function*(){
            //选择你要上传的仓库
            client.useBucket(ali_oss.bucket);
            //执行上传  put 执行上传方法  pic=》上传后的图片名字     filePath=》上传路径
            var results=yield client.put(pic,filePath);
            //同步删除本地图片
            fs.unlinkSync(filePath);
            res.end(JSON.stringify({status:'100',msg:'上传成功'}));
        }).catch(function(err){
            res.end(JSON.stringify({status:'101',msg:'上传失败',error:JSON.stringify(err)}));
        })

        let sql="insert into shoplists (name,pic,content,fee)values('"+name+"','"+pic+"','"+content+"','"+fee+"')";
        connection.query(sql,(error,results,fields)=>{
            if(results.affectedRows>0){
                res.redirect("/adminshoplist")
            }
        })


    })

 })

 //商家列表
 app.get("/adminshoplist",checkislogin,function(req,res){
     //给客户端传递4个数据  counts 数据总条数  pages 当前页  page=》当前页码-1  data=》当前页数据
    //获取客户端传递的page
    let page=(req.query.page==undefined)?0:req.query.page;
    //pages  parseInt=>把字符串强制转换为整形
    let pages=parseInt(page)+1;
    let startPage=page*2;
    //as 在sql语句里面 可以给字段起别名
    let count="select count(*) as count from shoplists";
    let sql=`select * from shoplists limit ${startPage},2`;
    connection.query(count,(error,results,fields)=>{
        // console.log(results[0].count);res.end()
        let counts=results[0].count;
        //执行sql
        connection.query(sql,(error,results,fields)=>{
            res.render("AdminShoplist/adminshoplist",{count:counts,pages:pages,page:page,data:results,islogin:req.session.loginname})
        })
        
    })
 })

 //删除
 app.get("/adminshoplistdel",checkislogin,function(req,res){
    //获取id
    let id=req.query.id;
    let sql="delete from shoplists where id="+id;
    connection.query(sql,(error,results,fields)=>{
        if(results.affectedRows>0){
            res.redirect("/adminshoplist")
        }
    })
 })

 //获取需要修改的商家信息
 app.get("/adminshoplistedit",checkislogin,function(req,res){
    //获取id
    let id=req.query.id;
    let sql="select * from shoplists where id="+id;
    //执行sql
    connection.query(sql,(error,results,fields)=>{
        res.render("AdminShoplist/adminshoplistedit",{data:results[0],islogin:req.session.loginname})
    })
 })

 //执行修改
 app.post("/doadminshoplistedit",checkislogin,function(req,res){
        //实例化formidable
        let form=new formidable.IncomingForm();
        //设置上传文件后缀及路径
        form.keepExtensions=true;
        form.uploadDir="./uploads";
        //表单解析
        form.parse(req,function(err,fields,files){
            console.log(files);
            // res.end();
            if(files.pic.size>0){
                //有图片上传 执行图片修改
                //获取参数
                let name=fields.name;
                let content=fields.content;
                let fee=fields.fee;
                let id=fields.id;
                // console.log(files);return;
                let pics=files.pic.path;
                let pic=pics.slice(8)
                let filePath=files.pic.path;
                //阿里oss执行文件上传
                co(function*(){
                    //选择你要上传的仓库
                    client.useBucket(ali_oss.bucket);
                    //执行上传  put 执行上传方法  pic=》上传后的图片名字     filePath=》上传路径
                    var results=yield client.put(pic,filePath);
                    //同步删除本地图片
                    fs.unlinkSync(filePath);
                    res.end(JSON.stringify({status:'100',msg:'上传成功'}));
                }).catch(function(err){
                    res.end(JSON.stringify({status:'101',msg:'上传失败',error:JSON.stringify(err)}));
                })

                let sql="update shoplists set name='"+name+"',pic='"+pic+"',content='"+content+"',fee='"+fee+"' where id="+id;
                connection.query(sql,(error,results,fields)=>{
                    if(results.affectedRows>0){
                        res.redirect("/adminshoplist")
                    }
                })
            }else{
                //没有图片上传 =》不需要修改图片
                let name1=fields.name;
                let content1=fields.content;
                let fee1=fields.fee;
                let id1=fields.id;
                let sql1="update shoplists set name='"+name1+"',content='"+content1+"',fee='"+fee1+"' where id="+id1;
                connection.query(sql1,(error,results,fields)=>{
                    if(results.affectedRows>0){
                        res.redirect("/adminshoplist")
                    }
                })

            }
            


        })


 })
  //商家食品添加
  app.get("/adminfoodslistadd",checkislogin,function(req,res){
    //获取商家数据
    let sql="select * from shoplists";
    connection.query(sql,(error,results,fields)=>{
        res.render("AdminGoodslist/admingoodslistadd",{data:results,islogin:req.session.loginname})
    })
    
 })
 //食品执行添加
 app.post("/doadmingoodslistadd",checkislogin,function(req,res){
    //实例化formidable
    let form=new formidable.IncomingForm();
    //设置上传文件后缀及路径
    form.keepExtensions=true;
    form.uploadDir="./uploads";
    //表单解析
    form.parse(req,function(err,fields,files){
        //获取参数
        let foodname=fields.foodname;
        let descr=fields.descr;
        let price=fields.price;
        let shoplist_id=fields.shoplist_id;

        // console.log(foodname,descr,price,shoplist_id);return;
        let pics=files.foodpic.path;
        let pic=pics.slice(8)
        let filePath=files.foodpic.path;
        // console.log(pic);
        // console.log(filePath);return;
        // res.end();
        //阿里oss执行文件上传
        co(function*(){
            //选择你要上传的仓库
            client.useBucket(ali_oss.bucket);
            //执行上传  put 执行上传方法  pic=》上传后的图片名字     filePath=》上传路径
            var results=yield client.put(pic,filePath);
            //同步删除本地图片
            fs.unlinkSync(filePath);
            res.end(JSON.stringify({status:'100',msg:'上传成功'}));
        }).catch(function(err){
            res.end(JSON.stringify({status:'101',msg:'上传失败',error:JSON.stringify(err)}));
        })

        let sql="insert into goods (foodname,foodpic,descr,price,shoplist_id)values('"+foodname+"','"+pic+"','"+descr+"','"+price+"','"+shoplist_id+"')";
        connection.query(sql,(error,results,fields)=>{
            if(results.affectedRows>0){
                // res.end("ok")
                res.redirect("/adminfoodslist")
            }
        })


    })

 })

 //商家食品的列表
 app.get("/adminfoodslist",checkislogin,function(req,res){
    //准备sql
    let sql="select goods.id as gid,goods.foodname,shoplists.name as sname,goods.foodpic,goods.descr,goods.price from goods,shoplists where goods.shoplist_id=shoplists.id";
    connection.query(sql,(error,results,fields)=>{
        res.render("AdminGoodslist/admingoodslist",{data:results,islogin:req.session.loginname})

    })
 })

 //加载订单列表
app.get("/adminorders",checkislogin,function(req,res){
    let sql="select * from orders";
    connection.query(sql,(error,results,fields)=>{
        //加载模板
        res.render("AdminOrders/adminorders",{data:results,islogin:req.session.loginname});
    })
    
 })

 //订单详情
 app.get("/adminordersinfo",checkislogin,function(req,res){
    //获取订单id
    let id=req.query.id;
    //sql
    let sql="select * from orders_goods where orders_id="+id;
    connection.query(sql,(error,results,fields)=>{
         //加载模板
         res.render("AdminOrders/adminordersinfo",{data:results,islogin:req.session.loginname});
    })
 })
 //退出
app.get("/logout",function(req,res){
    req.session.loginname=''
    res.redirect("/login")
})
//5.设置监听端口
app.listen(8002,function(){
    console.log("服务启动")
})
