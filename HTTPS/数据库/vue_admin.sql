/*
   SQLyog Ultimate v13.1.1 (64 bit)
   MySQL - 5.7.35 : Database - liulei
   *********************************************************************
   */

/*!40101 SET NAMES utf8 */
;

/*!40101 SET SQL_MODE=''*/
;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */
;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */
;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */
;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */
;
USE `liulei`;

/*Table structure for table `cooperation` */

DROP TABLE
IF
  EXISTS `cooperation`;

  CREATE TABLE `cooperation` (
    `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '编号'
    , `name` varchar(255) DEFAULT NULL COMMENT '昵称'
    , `wechat` varchar(255) DEFAULT NULL COMMENT '微信号'
    , `remark` varchar(255) DEFAULT NULL COMMENT '备注'
    , `more_id` int(11) DEFAULT NULL COMMENT '多账号编号'
    , `update_time` timestamp NULL DEFAULT NULL
    ON
    UPDATE
      CURRENT_TIMESTAMP COMMENT '更新时间'
      , `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
      , PRIMARY KEY (`id`)
  ) ENGINE = MyISAM DEFAULT CHARSET = utf8;

  /*Data for the table `cooperation` */

  /*Table structure for table `dict` */

  DROP TABLE
  IF
    EXISTS `dict`;

    CREATE TABLE `dict` (
      `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增编号'
      , `name` varchar(255) DEFAULT NULL COMMENT '名称'
      , `type` varchar(255) DEFAULT NULL COMMENT '类型字符'
      , `remark` varchar(255) DEFAULT NULL COMMENT '备注'
      , `update_time` timestamp NULL DEFAULT NULL
      ON
      UPDATE
        CURRENT_TIMESTAMP COMMENT '更新时间'
        , `create_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
        , PRIMARY KEY (`id`)
    ) ENGINE = InnoDB AUTO_INCREMENT = 4 DEFAULT CHARSET = utf8;

    /*Data for the table `dict` */

    insert into
      `dict`(
        `id`
        , `name`
        , `type`
        , `remark`
        , `update_time`
        , `create_time`
      )
    values
      (
        1
        , '字典1'
        , 'type1'
        , '第一'
        , '2023-05-25 10:29:01'
        , '2023-03-27 17:35:34'
      )
      , (
        2
        , '字典2'
        , 'type2'
        , '第二1'
        , '2023-05-26 10:31:51'
        , '2023-03-30 14:36:52'
      )
      , (
        3
        , '性别'
        , 'dict_sex'
        , NULL
        , NULL
        , '2024-04-10 11:30:58'
      );

    /*Table structure for table `dict_item` */

    DROP TABLE
    IF
      EXISTS `dict_item`;

      CREATE TABLE `dict_item` (
        `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增编号'
        , `dict_id` int(11) DEFAULT NULL COMMENT '字典父级id'
        , `dict_label` varchar(255) DEFAULT '' COMMENT '标签'
        , `dict_value` varchar(255) DEFAULT '' COMMENT '值'
        , `dict_sort` int(11) DEFAULT '0' COMMENT '排序'
        , `dict_class` varchar(255) DEFAULT '' COMMENT '样式'
        , `status` int(11) DEFAULT '1' COMMENT '状态'
        , `remark` varchar(255) DEFAULT '' COMMENT '备注'
        , `update_time` timestamp NULL DEFAULT NULL
        ON
        UPDATE
          CURRENT_TIMESTAMP COMMENT '更新时间'
          , `create_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
          , PRIMARY KEY (`id`)
      ) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8;

      /*Data for the table `dict_item` */

      insert into
        `dict_item`(
          `id`
          , `dict_id`
          , `dict_label`
          , `dict_value`
          , `dict_sort`
          , `dict_class`
          , `status`
          , `remark`
          , `update_time`
          , `create_time`
        )
      values
        (
          1
          , 3
          , '男'
          , '1'
          , 0
          , 'primary'
          , 1
          , NULL
          , NULL
          , '2024-04-10 11:31:14'
        )
        , (
          2
          , 3
          , '女'
          , '2'
          , 1
          , 'warning'
          , 1
          , NULL
          , '2024-04-10 11:31:36'
          , '2024-04-10 11:31:26'
        );

      /*Table structure for table `ditor` */

      DROP TABLE
      IF
        EXISTS `ditor`;

        CREATE TABLE `ditor` (
          `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '编号'
          , `val` text COMMENT '富文本值'
          , `update_time` timestamp NULL DEFAULT NULL
          ON
          UPDATE
            CURRENT_TIMESTAMP COMMENT '修改时间'
            , `create_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
            , PRIMARY KEY (`id`)
        ) ENGINE = MyISAM AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8;

        /*Data for the table `ditor` */

        insert into
          `ditor`(`id`, `val`, `update_time`, `create_time`)
        values
          (
            1
            , '<h2 style=\"text-align: left;\"></h2><h2 style=\"text-align: start;\">最新消息：<span style=\"color: rgb(225, 60, 57);\">vue3版本已经开发完成！点击获取最新vue3源码</span></h2><p style=\"text-align: start;\"><br></p><h3 style=\"text-align: start;\">最新升级版已完成，预览地址：点击进入效果预览</h3><h3 style=\"text-align: start;\">升级新功能如下：</h3><ol><li style=\"text-align: start;\">整体进行优化代码，使得更小更容易上手。</li><li style=\"text-align: start;\">加入登陆图形验证码验证，升级密码加密难度。</li><li style=\"text-align: start;\">加入下载模板、导入、导出功能。</li><li style=\"text-align: start;\">加入上传图片、上传文件（视频、音频等其他格式文件）。</li><li style=\"text-align: start;\">加入个人信息管理页面。</li><li style=\"text-align: start;\">加入富文本编辑功能。</li><li style=\"text-align: start;\">加入大屏统计echarts展示功能。</li></ol><h3 style=\"text-align: start;\"><strong>目前仓库是旧版源码（不建议继续使用），升级版源码请：</strong>点击免费获取vue2升级版源码</h3><hr/><h2 style=\"text-align: left;\"></h2><h3 style=\"text-align: start;\"><strong>《本开源库衍生的真实线上微信小程序》</strong>：</h3><ol><li style=\"text-align: start;\">入口一：微信上搜索小程序：共享wx</li><li style=\"text-align: start;\">入口二：微信扫码以下二维码体验效果</li></ol><p style=\"text-align: start;\"><img src=\"https://foruda.gitee.com/images/1706259979478250995/03d1fb75_8986810.jpeg\" alt=\"小程序\" data-href=\"https://gitee.com/MMinter/vue_node\" style=\"\"></p><p style=\"text-align: start;\"><br></p><h2 style=\"text-align: left;\">一、项目预览地址</h2><ul><li style=\"text-align: left;\">vue+node后台管理预览地址：点击进入效果预览</li><li style=\"text-align: left;\">默认账号：admin</li><li style=\"text-align: left;\">默认密码：666666</li></ul><h2 style=\"text-align: left;\">二、交流群、问题解答入口</h2><ul><li style=\"text-align: left;\">点击加入 问题解答交流社区</li></ul><h2 style=\"text-align: left;\">三、项目启动</h2><ul><li style=\"text-align: left;\">前端页面启动</li></ul><ol><li style=\"text-align: left;\">#克隆项目git https://gitee.com/MMinter/vue_node.git</li><li style=\"text-align: left;\">#进入目录cd item</li><li style=\"text-align: left;\">#安装依赖（建议使用node版本16以下 10以上）npm install</li><li style=\"text-align: left;\">#启动项目npm run dev</li></ol><ul><li style=\"text-align: left;\">数据库导入</li></ul><ol><li style=\"text-align: left;\">#创建数据库创建数据库 名：liulei基字符集 选：默认（default） 或者 utf8排序规则 选：默认（default） 或者 utf8_general_ci</li><li style=\"text-align: left;\">#导入数据库将APP/数据库 文件夹的liulei.sql导入新建的liulei库中。</li><li style=\"text-align: left;\">#数据库配置信息//配置文件在APP/poo.js 中，请根据自身环境配置 const pool=mysql.createPool({ host:\"127.0.0.1\", port:3306,//端口 user:\"root\",//账户名 password:\"root\",//登录密码 database:\"liulei\",//数据库名称 connectionLimit:15 });</li></ol><ul><li style=\"text-align: left;\">后端服务启动</li></ul><ol><li style=\"text-align: left;\">#克隆项目（如果已经执行了前端页面启动的克隆，可略过这点）git clone https://gitee.com/MMinter/vue_node.git</li><li style=\"text-align: left;\">#进入目录cd APP</li><li style=\"text-align: left;\">#安装依赖npm install</li><li style=\"text-align: left;\">#启动服务npm run dev</li></ol><h2 style=\"text-align: left;\">四、功能简明</h2><ul><li style=\"text-align: left;\">前端功能 (点击进入前端功能详细文档)​ 动态路由 ​ 菜单管理 ​ 用户管理 ​ 角色管理 ​ 多账号管理 ​ 字典管理 ​ 主题自定义 ​ 菜单权限 ​ 角色权限</li><li style=\"text-align: left;\">后端功能 (点击进入后端功能详细文档)​ jsonwebtoken（token） ​ 菜单权限拦截 ​ 角色权限拦截 ​ 错误日志log`</li></ul><h2 style=\"text-align: left;\">五、效果截图</h2><p style=\"text-align: left;\"><img src=\"https://foruda.gitee.com/images/1681197680240561436/dfbf1881_8986810.png\" alt=\"登录\" data-href=\"\" style=\"width: 626.00px;height: 302.88px;\"></p><table style=\"width: auto; text-align: left;\"><tbody><tr><th colspan=\"1\" rowspan=\"1\" width=\"auto\"><img src=\"https://foruda.gitee.com/images/1681197937191145993/c434e92e_8986810.png\" alt=\"用户管理\" data-href=\"\" style=\"\"></th><th colspan=\"1\" rowspan=\"1\" width=\"auto\"><img src=\"https://foruda.gitee.com/images/1681263456631597583/3077263f_8986810.png\" alt=\"主题修改\" data-href=\"\" style=\"\"></th></tr><tr><td colspan=\"1\" rowspan=\"1\" width=\"auto\"><img src=\"https://foruda.gitee.com/images/1681197808163981644/96f27575_8986810.png\" alt=\"菜单管理\" data-href=\"\" style=\"\"></td><td colspan=\"1\" rowspan=\"1\" width=\"auto\"><img src=\"https://foruda.gitee.com/images/1681197825348384952/281da67c_8986810.png\" alt=\"菜单修改\" data-href=\"\" style=\"\"></td></tr><tr><td colspan=\"1\" rowspan=\"1\" width=\"auto\"><img src=\"https://foruda.gitee.com/images/1681197773630264222/4ec415e3_8986810.png\" alt=\"角色管理\" data-href=\"\" style=\"\"></td><td colspan=\"1\" rowspan=\"1\" width=\"auto\"><img src=\"https://foruda.gitee.com/images/1681197948454663203/788cbd7e_8986810.png\" alt=\"字典管理\" data-href=\"\" style=\"\"></td></tr></tbody></table><p><br></p>'
            , '2024-04-12 10:29:52'
            , '2023-06-21 14:25:45'
          );

        /*Table structure for table `file_box` */

        DROP TABLE
        IF
          EXISTS `file_box`;

          CREATE TABLE `file_box` (
            `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '编号'
            , `url` varchar(255) DEFAULT NULL COMMENT '图片链接'
            , `name` varchar(255) DEFAULT NULL COMMENT '图片名称'
            , `type` int(11) DEFAULT NULL COMMENT '区分类型，1图片；2视频；3其他'
            , `more_id` int(11) DEFAULT NULL COMMENT '多账号id(需要可做区分)'
            , `menu_id` int(11) DEFAULT NULL COMMENT '分类id'
            , `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
            , `update_time` timestamp NULL DEFAULT NULL
            ON
            UPDATE
              CURRENT_TIMESTAMP COMMENT '修改时间'
              , PRIMARY KEY (`id`)
          ) ENGINE = MyISAM AUTO_INCREMENT = 6 DEFAULT CHARSET = utf8 ROW_FORMAT = DYNAMIC;

          /*Data for the table `file_box` */

          insert into
            `file_box`(
              `id`
              , `url`
              , `name`
              , `type`
              , `more_id`
              , `menu_id`
              , `create_time`
              , `update_time`
            )
          values
            (
              1
              , '/默认文件夹/1742548031890003416154165499852-logo.jpg'
              , 'logo.jpg'
              , 1
              , NULL
              , 1
              , '2025-03-21 17:07:11'
              , '2025-04-01 09:31:06'
            )
            , (
              2
              , '/默认文件夹/174254803781107569982284948242-wxChat.jpg'
              , 'wxChat.jpg'
              , 1
              , NULL
              , 1
              , '2025-03-21 17:07:17'
              , '2025-04-01 09:31:08'
            )
            , (
              3
              , '/默认文件夹/17425480378210962090398608562-vue3.png'
              , 'vue3.png'
              , 1
              , NULL
              , 1
              , '2025-03-21 17:07:17'
              , '2025-04-01 09:31:11'
            )
            , (
              4
              , '/默认文件夹/17425480378150005518768036639088-user.png'
              , 'user.png'
              , 1
              , NULL
              , 1
              , '2025-03-21 17:07:17'
              , '2025-04-01 09:31:13'
            )
            , (
              5
              , '/默认文件夹/174254879545104578429515928357-视频演示1.mp4'
              , '视频演示1.mp4'
              , 2
              , NULL
              , 1
              , '2025-03-21 17:19:55'
              , '2025-04-01 09:31:16'
            );

          /*Table structure for table `file_menu` */

          DROP TABLE
          IF
            EXISTS `file_menu`;

            CREATE TABLE `file_menu` (
              `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '编号'
              , `name` varchar(255) DEFAULT NULL COMMENT '名称'
              , `more_id` int(11) DEFAULT NULL COMMENT '多账号id'
              , `sort` int(11) DEFAULT NULL COMMENT '排序'
              , `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
              , `update_time` timestamp NULL DEFAULT NULL
              ON
              UPDATE
                CURRENT_TIMESTAMP COMMENT '修改时间'
                , PRIMARY KEY (`id`)
            ) ENGINE = MyISAM AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8 ROW_FORMAT = DYNAMIC;

            /*Data for the table `file_menu` */

            insert into
              `file_menu`(
                `id`
                , `name`
                , `more_id`
                , `sort`
                , `create_time`
                , `update_time`
              )
            values
              (1, '默认文件夹', NULL, 0, '2025-03-19 17:50:38', NULL);

            /*Table structure for table `files` */

            DROP TABLE
            IF
              EXISTS `files`;

              CREATE TABLE `files` (
                `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '编号'
                , `val` varchar(6000) DEFAULT NULL COMMENT '值'
                , `type` int(11) DEFAULT '1' COMMENT '判断1图片，2其他'
                , `update_time` timestamp NULL DEFAULT NULL
                ON
                UPDATE
                  CURRENT_TIMESTAMP COMMENT '更新时间'
                  , `create_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
                  , PRIMARY KEY (`id`)
              ) ENGINE = MyISAM DEFAULT CHARSET = utf8;

              /*Data for the table `files` */

              /*Table structure for table `logs` */

              DROP TABLE
              IF
                EXISTS `logs`;

                CREATE TABLE `logs` (
                  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '编号'
                  , `user_id` int(11) DEFAULT NULL COMMENT '用户id'
                  , `name` varchar(255) DEFAULT NULL COMMENT '用户昵称'
                  , `browser` varchar(255) DEFAULT NULL COMMENT '浏览器'
                  , `system_name` varchar(255) DEFAULT NULL COMMENT '系统'
                  , `host` varchar(255) DEFAULT NULL COMMENT '主机'
                  , `place` varchar(255) DEFAULT NULL COMMENT '地点'
                  , `port` varchar(255) DEFAULT NULL COMMENT '接口地址'
                  , `remark` varchar(255) DEFAULT NULL COMMENT '备注'
                  , `update_time` timestamp NULL DEFAULT NULL
                  ON
                  UPDATE
                    CURRENT_TIMESTAMP COMMENT '更新时间'
                    , `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
                    , PRIMARY KEY (`id`)
                ) ENGINE = MyISAM AUTO_INCREMENT = 6 DEFAULT CHARSET = utf8;

                /*Data for the table `logs` */

                insert into
                  `logs`(
                    `id`
                    , `user_id`
                    , `name`
                    , `browser`
                    , `system_name`
                    , `host`
                    , `place`
                    , `port`
                    , `remark`
                    , `update_time`
                    , `create_time`
                  )
                values
                  (
                    1
                    , 1
                    , 'admin'
                    , 'Edge'
                    , 'Windows_NT'
                    , '::ffff:127.0.0.1'
                    , NULL
                    , '/changeMenu'
                    , NULL
                    , NULL
                    , '2025-05-20 18:16:02'
                  )
                  , (
                    2
                    , 1
                    , 'admin'
                    , 'Edge'
                    , 'Windows_NT'
                    , '::ffff:127.0.0.1'
                    , NULL
                    , '/changeMenu'
                    , NULL
                    , NULL
                    , '2025-05-30 16:19:26'
                  )
                  , (
                    3
                    , 1
                    , 'admin'
                    , 'Edge'
                    , 'Windows_NT'
                    , '::ffff:127.0.0.1'
                    , NULL
                    , '/changeMenu'
                    , NULL
                    , NULL
                    , '2025-05-30 16:19:48'
                  )
                  , (
                    4
                    , 1
                    , 'admin'
                    , 'Edge'
                    , 'Windows_NT'
                    , '::ffff:127.0.0.1'
                    , NULL
                    , '/changeMenu'
                    , NULL
                    , NULL
                    , '2025-05-30 16:23:14'
                  )
                  , (
                    5
                    , 1
                    , 'admin'
                    , 'Edge'
                    , 'Windows_NT'
                    , '::ffff:127.0.0.1'
                    , NULL
                    , '/changeMenu'
                    , NULL
                    , NULL
                    , '2025-05-30 16:39:28'
                  );

                /*Table structure for table `more` */

                DROP TABLE
                IF
                  EXISTS `more`;

                  CREATE TABLE `more` (
                    `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '编号'
                    , `name` varchar(255) NOT NULL DEFAULT '' COMMENT '账号昵称'
                    , `remark` varchar(255) DEFAULT NULL COMMENT '备注'
                    , `update_time` timestamp NULL DEFAULT NULL
                    ON
                    UPDATE
                      CURRENT_TIMESTAMP COMMENT '修改时间'
                      , `create_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
                      , PRIMARY KEY (`id`)
                  ) ENGINE = MyISAM AUTO_INCREMENT = 16 DEFAULT CHARSET = utf8;

                  /*Data for the table `more` */

                  insert into
                    `more`(`id`, `name`, `remark`, `update_time`, `create_time`)
                  values
                    (
                      8
                      , '第二家店铺'
                      , ''
                      , '2023-06-16 15:42:24'
                      , '2023-04-06 15:44:53'
                    )
                    , (
                      5
                      , '第一家店铺'
                      , ''
                      , '2023-06-16 15:42:26'
                      , '2023-04-06 15:44:53'
                    );

                  /*Table structure for table `roles` */

                  DROP TABLE
                  IF
                    EXISTS `roles`;

                    CREATE TABLE `roles` (
                      `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '编号'
                      , `name` varchar(225) NOT NULL DEFAULT '' COMMENT '名称'
                      , `roles` varchar(10000) NOT NULL DEFAULT '' COMMENT '权限标识'
                      , `checked_roles` varchar(255) NOT NULL DEFAULT '' COMMENT '权限默认选中标识'
                      , `role_key` varchar(10000) DEFAULT '' COMMENT '权限字符'
                      , `update_time` timestamp NULL DEFAULT NULL
                      ON
                      UPDATE
                        CURRENT_TIMESTAMP COMMENT '更新时间'
                        , `create_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
                        , PRIMARY KEY (`id`)
                    ) ENGINE = MyISAM AUTO_INCREMENT = 23 DEFAULT CHARSET = utf8;

                    /*Data for the table `roles` */

                    insert into
                      `roles`(
                        `id`
                        , `name`
                        , `roles`
                        , `checked_roles`
                        , `role_key`
                        , `update_time`
                        , `create_time`
                      )
                    values
                      (
                        1
                        , 'admin'
                        , '8,9,10,2,5,11,17,1'
                        , '8,9,10,5,11,17'
                        , 'admin'
                        , NULL
                        , '2023-04-06 15:39:40'
                      )
                      , (
                        12
                        , '中级管家2'
                        , '49,30,43,31,131,130,128,125,122,132,123,121,124,1,10,8,26,27,69,76,133,32,113,44,134,139,138,137,136,135,65,68,85,140,141,106,107,108,109,110'
                        , '49,43,31,32,68'
                        , 'middle'
                        , '2025-03-20 11:41:07'
                        , '2023-04-06 15:39:40'
                      )
                      , (
                        13
                        , '初级管家1'
                        , '49,30,43,31,131,130,128,125,122,132,123,121,124,1,10,8,26,27,69,76,133,32,113,44,65,66'
                        , '49,43,31,10,8,26,27,76,32,113,110,109,108,107,105,104,103,102,100,99,98,97,96,92,91,90,89,66,68'
                        , 'primary'
                        , '2025-03-20 11:40:36'
                        , '2023-04-06 15:39:40'
                      );

                    /*Table structure for table `router_menu` */

                    DROP TABLE
                    IF
                      EXISTS `router_menu`;

                      CREATE TABLE `router_menu` (
                        `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '编号'
                        , `parent_id` int(11) NOT NULL DEFAULT '0' COMMENT '父级id'
                        , `title` varchar(255) DEFAULT '' COMMENT '标题'
                        , `icon` varchar(255) DEFAULT '' COMMENT '图标'
                        , `no_cache` int(11) DEFAULT '1' COMMENT '是否缓存'
                        , `meta` varchar(255) NOT NULL DEFAULT '' COMMENT '其他对象'
                        , `path` varchar(255) NOT NULL DEFAULT '/' COMMENT '路由地址'
                        , `hidden` tinyint(1) NOT NULL DEFAULT '0' COMMENT ' 当设置 true 的时候该路由不会在侧边栏出现 如401，login等页面'
                        , `redirect` varchar(255) NOT NULL DEFAULT '' COMMENT '当设置 noRedirect 的时候该路由在面包屑导航中不可被点击'
                        , `always_show` tinyint(1) NOT NULL DEFAULT '0' COMMENT '你可以设置 alwaysShow: true，这样它就会忽略之前定义的规则，一直显示根路由'
                        , `name` varchar(255) NOT NULL DEFAULT '' COMMENT '设定路由的名字，一定要填写不然使用<keep-alive>时会出现各种问题'
                        , `layout` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否需要含导航栏，只需一级才设置这个（默认为false）'
                        , `parent_view` tinyint(1) NOT NULL DEFAULT '0' COMMENT '如果第二级里面还需要套级，需在当前级设置为true'
                        , `component` varchar(255) NOT NULL DEFAULT '/' COMMENT '对应的页面路径'
                        , `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序'
                        , `alone` int(11) NOT NULL DEFAULT '0' COMMENT '是否独立的（一级）'
                        , `role_key` varchar(255) DEFAULT '' COMMENT '权限字符'
                        , `menu_type` varchar(255) NOT NULL DEFAULT 'C' COMMENT '菜单类型区分'
                        , `update_time` timestamp NULL DEFAULT NULL
                        ON
                        UPDATE
                          CURRENT_TIMESTAMP COMMENT '更新时间'
                          , `create_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
                          , PRIMARY KEY (`id`)
                      ) ENGINE = MyISAM AUTO_INCREMENT = 153 DEFAULT CHARSET = utf8;

                      /*Data for the table `router_menu` */

                      insert into
                        `router_menu`(
                          `id`
                          , `parent_id`
                          , `title`
                          , `icon`
                          , `no_cache`
                          , `meta`
                          , `path`
                          , `hidden`
                          , `redirect`
                          , `always_show`
                          , `name`
                          , `layout`
                          , `parent_view`
                          , `component`
                          , `sort`
                          , `alone`
                          , `role_key`
                          , `menu_type`
                          , `update_time`
                          , `create_time`
                        )
                      values
                        (
                          1
                          , 0
                          , '系统设置'
                          , 'international'
                          , 1
                          , '{}'
                          , '/system'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 1
                          , 0
                          , '/'
                          , 11
                          , 0
                          , ''
                          , 'M'
                          , '2025-04-01 15:37:00'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          26
                          , 1
                          , '用户管理'
                          , 'user'
                          , 1
                          , '{}'
                          , '/user'
                          , 0
                          , ''
                          , 0
                          , 'user'
                          , 0
                          , 0
                          , 'system/user'
                          , 2
                          , 0
                          , ''
                          , 'C'
                          , '2025-04-01 15:36:10'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          27
                          , 1
                          , '多账号管理'
                          , 'peoples'
                          , 1
                          , '{}'
                          , '/more'
                          , 0
                          , ''
                          , 0
                          , 'more'
                          , 0
                          , 0
                          , 'system/more'
                          , 3
                          , 0
                          , ''
                          , 'C'
                          , '2025-04-01 15:36:12'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          49
                          , 0
                          , '图标'
                          , 'icon'
                          , 1
                          , '{}'
                          , '/icon'
                          , 0
                          , ''
                          , 0
                          , 'Icon'
                          , 1
                          , 0
                          , 'icons/index'
                          , 0
                          , 0
                          , NULL
                          , 'C'
                          , '2025-01-09 15:45:44'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          8
                          , 1
                          , '角色管理'
                          , 'question'
                          , 1
                          , '{}'
                          , '/role'
                          , 0
                          , ''
                          , 0
                          , 'Role'
                          , 0
                          , 0
                          , 'system/role'
                          , 1
                          , 0
                          , ''
                          , 'C'
                          , '2025-04-01 15:36:15'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          30
                          , 0
                          , '测试数据'
                          , 'bug'
                          , 1
                          , '{}'
                          , '/test'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 1
                          , 0
                          , '/'
                          , 0
                          , 0
                          , ''
                          , 'M'
                          , '2025-01-09 15:45:48'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          10
                          , 1
                          , '菜单管理'
                          , 'list'
                          , 1
                          , '{}'
                          , '/menu'
                          , 0
                          , ''
                          , 0
                          , 'Menu'
                          , 0
                          , 0
                          , 'system/menu'
                          , 0
                          , 0
                          , ''
                          , 'C'
                          , '2025-04-01 15:36:19'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          31
                          , 30
                          , '多账号测试'
                          , 'bug'
                          , 1
                          , '{}'
                          , '/index'
                          , 0
                          , ''
                          , 0
                          , 'testMore'
                          , 0
                          , 0
                          , 'test/index'
                          , 1
                          , 0
                          , ''
                          , 'C'
                          , '2025-01-09 14:57:43'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          32
                          , 0
                          , 'Gitee直达'
                          , 'link'
                          , 1
                          , '{}'
                          , 'https://gitee.com/MMinter/vue_node'
                          , 0
                          , ''
                          , 0
                          , 'link'
                          , 1
                          , 0
                          , '/'
                          , 14
                          , 0
                          , ''
                          , 'C'
                          , '2023-04-11 11:23:33'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          65
                          , 44
                          , '测试数据'
                          , 'eye'
                          , 1
                          , '{}'
                          , ''
                          , 1
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , NULL
                          , 'F'
                          , '2023-03-27 15:18:34'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          44
                          , 0
                          , '菜单权限字符'
                          , 'eye'
                          , 1
                          , '{}'
                          , ''
                          , 1
                          , ''
                          , 0
                          , ''
                          , 1
                          , 0
                          , '/'
                          , 100
                          , 0
                          , NULL
                          , 'F'
                          , '2023-04-11 11:24:29'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          66
                          , 65
                          , '权限测试1'
                          , 'example'
                          , 1
                          , '{}'
                          , ''
                          , 1
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'roleKey2'
                          , 'F'
                          , '2025-04-07 16:38:41'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          43
                          , 30
                          , '权限隐藏API测试'
                          , 'eye'
                          , 1
                          , '{}'
                          , '/RoleApi'
                          , 0
                          , ''
                          , 0
                          , 'RoleApi'
                          , 0
                          , 0
                          , 'test/roleApi'
                          , 0
                          , 0
                          , ''
                          , 'C'
                          , '2023-03-15 15:52:16'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          68
                          , 65
                          , '权限测试2'
                          , 'example'
                          , 1
                          , '{}'
                          , ''
                          , 1
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 1
                          , 0
                          , 'roleKey2'
                          , 'F'
                          , '2023-03-27 15:23:59'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          69
                          , 1
                          , '字典管理'
                          , 'dashboard'
                          , 1
                          , '{}'
                          , '/dict'
                          , 0
                          , ''
                          , 0
                          , 'Dict'
                          , 0
                          , 0
                          , 'system/dict/index'
                          , 4
                          , 0
                          , NULL
                          , 'C'
                          , '2025-04-01 15:36:23'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          97
                          , 95
                          , '用户新增'
                          , 'user'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'user_add'
                          , 'F'
                          , '2023-04-03 16:47:22'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          85
                          , 44
                          , '系统设置'
                          , 'lock'
                          , 1
                          , '{}'
                          , '/'
                          , 1
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , ''
                          , 'F'
                          , '2023-04-03 15:21:17'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          88
                          , 85
                          , '菜单管理'
                          , 'documentation'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , NULL
                          , 'F'
                          , '2023-04-03 15:21:49'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          89
                          , 88
                          , '菜单查询'
                          , 'example'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'menu_query'
                          , 'F'
                          , '2023-04-03 15:22:46'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          90
                          , 88
                          , '菜单新增'
                          , 'example'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'menu_add'
                          , 'F'
                          , '2023-04-03 15:35:28'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          91
                          , 88
                          , '菜单修改'
                          , 'example'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'menu_up'
                          , 'F'
                          , '2023-04-03 15:36:06'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          92
                          , 88
                          , '菜单删除'
                          , 'example'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'menu_delete'
                          , 'F'
                          , '2023-04-03 15:36:19'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          76
                          , 69
                          , '字典项目'
                          , 'form'
                          , 1
                          , '{}'
                          , '/dictData'
                          , 0
                          , ''
                          , 0
                          , 'DictItem'
                          , 0
                          , 0
                          , 'system/dict/data'
                          , 0
                          , 0
                          , ''
                          , 'C'
                          , '2025-04-01 15:36:25'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          95
                          , 85
                          , '用户管理'
                          , 'user'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , NULL
                          , 'F'
                          , '2023-04-03 16:46:18'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          96
                          , 95
                          , '用户查询'
                          , 'user'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'user_query'
                          , 'F'
                          , '2023-04-03 16:46:56'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          98
                          , 95
                          , '用户修改'
                          , 'user'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'user_up'
                          , 'F'
                          , '2023-04-03 16:52:31'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          99
                          , 95
                          , '用户删除'
                          , 'user'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'user_delete'
                          , 'F'
                          , '2023-04-03 16:52:47'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          100
                          , 95
                          , '用户修改密码'
                          , 'eye'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'user_pwd'
                          , 'F'
                          , '2023-04-03 16:56:33'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          101
                          , 85
                          , '角色管理'
                          , 'peoples'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , NULL
                          , 'F'
                          , '2023-04-03 16:59:20'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          102
                          , 101
                          , '角色查询'
                          , 'peoples'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'role_query'
                          , 'F'
                          , '2023-04-03 16:59:33'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          103
                          , 101
                          , '角色新增'
                          , 'peoples'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'role_add'
                          , 'F'
                          , '2023-04-03 16:59:46'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          104
                          , 101
                          , '角色修改'
                          , 'peoples'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'role_up'
                          , 'F'
                          , '2023-04-03 17:00:04'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          105
                          , 101
                          , '角色删除'
                          , 'peoples'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'role_delete'
                          , 'F'
                          , '2023-04-03 17:00:24'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          106
                          , 85
                          , '多账户管理'
                          , 'nested'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , NULL
                          , 'F'
                          , '2023-04-03 17:12:25'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          107
                          , 106
                          , '多账户查询'
                          , 'people'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'more_query'
                          , 'F'
                          , '2023-04-03 17:31:07'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          108
                          , 106
                          , '多账户新增'
                          , 'people'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'more_add'
                          , 'F'
                          , '2023-04-03 17:31:30'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          109
                          , 106
                          , '多账户修改'
                          , 'people'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'more_up'
                          , 'F'
                          , '2023-04-03 17:31:47'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          110
                          , 106
                          , '多账户删除'
                          , 'people'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'more_delete'
                          , 'F'
                          , '2023-04-03 17:32:07'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          113
                          , 0
                          , 'GitHub直达'
                          , 'link'
                          , 1
                          , '{}'
                          , 'https://github.com/MingMinter/vue_node_admin'
                          , 0
                          , ''
                          , 0
                          , 'GitHub'
                          , 1
                          , 0
                          , '/'
                          , 16
                          , 0
                          , NULL
                          , 'C'
                          , '2023-06-15 14:50:55'
                          , '2023-05-26 11:11:07'
                        )
                        , (
                          121
                          , 122
                          , '上传图片'
                          , 'education'
                          , 1
                          , '{}'
                          , '/img'
                          , 0
                          , ''
                          , 0
                          , 'Img'
                          , 0
                          , 0
                          , 'components/img'
                          , 0
                          , 0
                          , NULL
                          , 'C'
                          , '2023-05-29 14:35:29'
                          , '2023-05-26 16:18:37'
                        )
                        , (
                          122
                          , 0
                          , '文件管理'
                          , 'zip'
                          , 1
                          , '{}'
                          , '/file'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 1
                          , 0
                          , '/'
                          , 1
                          , 0
                          , NULL
                          , 'M'
                          , '2024-04-12 10:25:37'
                          , '2023-05-29 14:35:16'
                        )
                        , (
                          123
                          , 122
                          , '上传文件'
                          , 'zip'
                          , 1
                          , '{}'
                          , '/file'
                          , 0
                          , ''
                          , 0
                          , 'File'
                          , 0
                          , 0
                          , 'components/file'
                          , 0
                          , 0
                          , NULL
                          , 'C'
                          , NULL
                          , '2023-05-30 15:13:26'
                        )
                        , (
                          124
                          , 0
                          , '我的信息'
                          , 'user'
                          , 1
                          , '{}'
                          , '/info'
                          , 0
                          , ''
                          , 0
                          , 'Info'
                          , 1
                          , 0
                          , 'system/info'
                          , 2
                          , 0
                          , 'www1'
                          , 'C'
                          , '2025-04-01 15:38:53'
                          , '2023-05-31 15:09:24'
                        )
                        , (
                          125
                          , 0
                          , '富文本编辑'
                          , 'form'
                          , 1
                          , '{}'
                          , '/ditor'
                          , 0
                          , ''
                          , 0
                          , 'Ditor'
                          , 1
                          , 0
                          , 'components/ditor'
                          , 1
                          , 0
                          , NULL
                          , 'C'
                          , '2023-06-15 14:38:54'
                          , '2023-06-02 10:00:59'
                        )
                        , (
                          128
                          , 0
                          , '大屏展示'
                          , 'chart'
                          , 1
                          , '{}'
                          , '/echart'
                          , 0
                          , ''
                          , 0
                          , 'Echart'
                          , 1
                          , 0
                          , 'components/echart'
                          , 1
                          , 0
                          , NULL
                          , 'C'
                          , '2024-04-12 10:13:41'
                          , '2023-06-13 10:24:44'
                        )
                        , (
                          130
                          , 0
                          , '页面合成图片'
                          , 'component'
                          , 1
                          , '{}'
                          , '/html2canvas'
                          , 0
                          , ''
                          , 0
                          , 'Html2canvas'
                          , 1
                          , 0
                          , 'components/html2canvas'
                          , 1
                          , 0
                          , NULL
                          , 'C'
                          , '2024-09-11 16:50:55'
                          , '2024-04-22 10:37:56'
                        )
                        , (
                          131
                          , 0
                          , '拖拽可视化'
                          , 'drag'
                          , 1
                          , '{}'
                          , '/draggable'
                          , 0
                          , ''
                          , 0
                          , 'Draggable'
                          , 1
                          , 0
                          , 'components/draggable'
                          , 1
                          , 0
                          , NULL
                          , 'C'
                          , '2025-04-07 16:37:55'
                          , '2024-08-31 12:49:32'
                        )
                        , (
                          132
                          , 122
                          , '文件管理模式'
                          , 'component'
                          , 1
                          , '{}'
                          , '/imgAdmin'
                          , 0
                          , ''
                          , 0
                          , 'ImgAdmin'
                          , 0
                          , 0
                          , 'components/imgAdmin'
                          , 0
                          , 0
                          , NULL
                          , 'C'
                          , '2025-03-19 16:31:26'
                          , '2024-09-04 21:02:39'
                        )
                        , (
                          133
                          , 1
                          , '操作日志'
                          , 'build'
                          , 1
                          , '{}'
                          , '/logs'
                          , 0
                          , ''
                          , 0
                          , 'Logs'
                          , 0
                          , 0
                          , 'system/logs'
                          , 5
                          , 0
                          , NULL
                          , 'C'
                          , '2025-04-01 15:36:30'
                          , '2025-01-09 16:10:53'
                        )
                        , (
                          134
                          , 44
                          , '文件管理'
                          , 'clipboard'
                          , 1
                          , '{}'
                          , '/'
                          , 1
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , NULL
                          , 'F'
                          , '2025-03-19 18:02:57'
                          , '2025-03-19 18:01:40'
                        )
                        , (
                          135
                          , 134
                          , '删除菜单'
                          , 'example'
                          , 1
                          , '{}'
                          , '/'
                          , 1
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'file_menu_delete'
                          , 'F'
                          , '2025-04-07 16:39:08'
                          , '2025-03-19 18:04:17'
                        )
                        , (
                          136
                          , 134
                          , '删除文件'
                          , 'example'
                          , 1
                          , '{}'
                          , '/'
                          , 1
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'file_delete'
                          , 'F'
                          , '2025-04-07 16:39:04'
                          , '2025-03-19 18:06:57'
                        )
                        , (
                          137
                          , 134
                          , '上传文件'
                          , 'example'
                          , 1
                          , '{}'
                          , '/'
                          , 1
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'file_add'
                          , 'F'
                          , '2025-04-07 16:38:57'
                          , '2025-03-19 18:08:28'
                        )
                        , (
                          138
                          , 134
                          , '修改菜单'
                          , 'example'
                          , 1
                          , '{}'
                          , '/'
                          , 1
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'file_menu_up'
                          , 'F'
                          , '2025-04-07 16:38:52'
                          , '2025-03-19 18:10:34'
                        )
                        , (
                          139
                          , 134
                          , '添加菜单'
                          , 'example'
                          , 1
                          , '{}'
                          , '/'
                          , 1
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'file_menu_add'
                          , 'F'
                          , '2025-04-07 16:38:48'
                          , '2025-03-19 18:10:57'
                        )
                        , (
                          140
                          , 85
                          , '操作日志'
                          , 'druid'
                          , 1
                          , '{}'
                          , '/'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , NULL
                          , 'F'
                          , NULL
                          , '2025-03-20 11:21:29'
                        )
                        , (
                          141
                          , 140
                          , '日志查询'
                          , 'example'
                          , 1
                          , '{}'
                          , '/'
                          , 1
                          , ''
                          , 0
                          , ''
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , 'logs_query'
                          , 'F'
                          , '2025-03-20 11:35:17'
                          , '2025-03-20 11:22:24'
                        )
                        , (
                          143
                          , 0
                          , '合作共赢'
                          , 'star'
                          , 1
                          , '{}'
                          , '/cooperation'
                          , 0
                          , ''
                          , 0
                          , 'Cooperation'
                          , 1
                          , 0
                          , 'cooperation'
                          , 12
                          , 0
                          , NULL
                          , 'C'
                          , '2025-05-20 18:16:02'
                          , '2025-05-20 18:10:50'
                        )
                        , (
                          144
                          , 0
                          , '虚拟列表'
                          , 'list'
                          , 1
                          , '{}'
                          , '/virtualList'
                          , 0
                          , ''
                          , 0
                          , 'VirtualList'
                          , 1
                          , 0
                          , 'components/virtualList/index'
                          , 2
                          , 0
                          , NULL
                          , 'C'
                          , '2025-05-30 16:39:28'
                          , '2025-05-30 16:19:19'
                        )
                        , (
                          145
                          , 0
                          , '多级菜单'
                          , 'cascader'
                          , 1
                          , '{}'
                          , '/multilayer'
                          , 0
                          , ''
                          , 0
                          , ''
                          , 1
                          , 0
                          , '/'
                          , 3
                          , 0
                          , NULL
                          , 'M'
                          , '2025-06-26 17:00:56'
                          , '2025-06-26 14:44:54'
                        )
                        , (
                          146
                          , 145
                          , '菜单1'
                          , 'cascader'
                          , 1
                          , '{}'
                          , '/multilayer1'
                          , 0
                          , ''
                          , 0
                          , 'Multilayer1'
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , NULL
                          , 'M'
                          , '2025-06-26 16:22:35'
                          , '2025-06-26 14:45:50'
                        )
                        , (
                          147
                          , 145
                          , '菜单2'
                          , 'cascader'
                          , 1
                          , '{}'
                          , '/multilayer2'
                          , 0
                          , ''
                          , 0
                          , 'Multilayer2'
                          , 0
                          , 0
                          , '/'
                          , 1
                          , 0
                          , NULL
                          , 'M'
                          , '2025-06-26 16:23:06'
                          , '2025-06-26 14:52:48'
                        )
                        , (
                          148
                          , 146
                          , '菜单1-1'
                          , 'cascader'
                          , 1
                          , '{}'
                          , '/multilayer1_1'
                          , 0
                          , ''
                          , 0
                          , 'Multilayer1_11'
                          , 0
                          , 0
                          , '/'
                          , 0
                          , 0
                          , NULL
                          , 'M'
                          , '2025-06-26 16:22:42'
                          , '2025-06-26 15:50:39'
                        )
                        , (
                          149
                          , 148
                          , '页面1_1_1'
                          , 'cascader'
                          , 1
                          , '{}'
                          , '/multilayer1_1_1'
                          , 0
                          , ''
                          , 0
                          , 'Multilayer1_1_1'
                          , 0
                          , 0
                          , 'multilayer/multilayer1/multilayer1_1/index'
                          , 0
                          , 0
                          , NULL
                          , 'C'
                          , '2025-06-26 16:22:55'
                          , '2025-06-26 16:08:33'
                        )
                        , (
                          150
                          , 148
                          , '页面1_1_2'
                          , 'cascader'
                          , 1
                          , '{}'
                          , '/multilayer1_1_2'
                          , 0
                          , ''
                          , 0
                          , 'Multilayer1_1_2'
                          , 0
                          , 0
                          , 'multilayer/multilayer1/multilayer1_1/index2'
                          , 1
                          , 0
                          , NULL
                          , 'C'
                          , '2025-06-26 16:22:50'
                          , '2025-06-26 16:09:57'
                        )
                        , (
                          151
                          , 147
                          , '页面2_1'
                          , 'cascader'
                          , 1
                          , '{}'
                          , '/multilayer2_1'
                          , 0
                          , ''
                          , 0
                          , 'Multilayer2_1'
                          , 0
                          , 0
                          , 'multilayer/multilayer2/index'
                          , 0
                          , 0
                          , NULL
                          , 'C'
                          , '2025-06-26 16:22:23'
                          , '2025-06-26 16:14:03'
                        )
                        , (
                          152
                          , 147
                          , '页面2_2 隐藏'
                          , 'cascader'
                          , 1
                          , '{}'
                          , '/multilayer2_2'
                          , 1
                          , ''
                          , 0
                          , 'Multilayer2_2'
                          , 0
                          , 0
                          , 'multilayer/multilayer2/index2'
                          , 0
                          , 0
                          , NULL
                          , 'C'
                          , '2025-06-26 16:38:36'
                          , '2025-06-26 16:16:10'
                        );

                      /*Table structure for table `tests` */

                      DROP TABLE
                      IF
                        EXISTS `tests`;

                        CREATE TABLE `tests` (
                          `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '编号'
                          , `name` varchar(255) DEFAULT NULL COMMENT '昵称'
                          , `remark` varchar(255) DEFAULT NULL COMMENT '备注'
                          , `more_id` int(11) DEFAULT NULL COMMENT '多账号编号'
                          , `update_time` timestamp NULL DEFAULT NULL
                          ON
                          UPDATE
                            CURRENT_TIMESTAMP COMMENT '更新时间'
                            , `create_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
                            , PRIMARY KEY (`id`)
                        ) ENGINE = MyISAM DEFAULT CHARSET = utf8;

                        /*Data for the table `tests` */

                        /*Table structure for table `theme` */

                        DROP TABLE
                        IF
                          EXISTS `theme`;

                          CREATE TABLE `theme` (
                            `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增'
                            , `user_id` int(11) DEFAULT NULL COMMENT '用户id'
                            , `menu_bg` varchar(255) DEFAULT '' COMMENT '默认背景'
                            , `menu_sub_bg` varchar(255) DEFAULT '' COMMENT '展开背景'
                            , `menu_text` varchar(255) DEFAULT '' COMMENT '默认文字'
                            , `menu_active_text` varchar(255) DEFAULT '' COMMENT '选中文字'
                            , `menu_sub_active_text` varchar(255) DEFAULT '' COMMENT '当前选中展开文字'
                            , `menu_hover_bg` varchar(255) DEFAULT '' COMMENT 'hover背景'
                            , `el_theme` tinyint(1) DEFAULT '0' COMMENT '是否开启el主题跟随'
                            , `el_bg` varchar(255) DEFAULT '' COMMENT 'el主题背景'
                            , `el_text` varchar(255) DEFAULT '' COMMENT 'el主题文字'
                            , `update_time` timestamp NULL DEFAULT NULL
                            ON
                            UPDATE
                              CURRENT_TIMESTAMP COMMENT '修改时间'
                              , `create_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
                              , PRIMARY KEY (`id`)
                          ) ENGINE = InnoDB AUTO_INCREMENT = 4 DEFAULT CHARSET = utf8;

                          /*Data for the table `theme` */

                          insert into
                            `theme`(
                              `id`
                              , `user_id`
                              , `menu_bg`
                              , `menu_sub_bg`
                              , `menu_text`
                              , `menu_active_text`
                              , `menu_sub_active_text`
                              , `menu_hover_bg`
                              , `el_theme`
                              , `el_bg`
                              , `el_text`
                              , `update_time`
                              , `create_time`
                            )
                          values
                            (
                              1
                              , 1
                              , '#304156'
                              , '#304156'
                              , '#bfcad5'
                              , '#409eff'
                              , '#fff'
                              , '#001528'
                              , 0
                              , '#304156'
                              , '#bfcad5'
                              , '2025-01-15 09:40:14'
                              , '2023-05-26 11:30:29'
                            )
                            , (
                              2
                              , 2
                              , '#304156'
                              , '#304156'
                              , '#bfcad5'
                              , '#409eff'
                              , '#fff'
                              , '#001528'
                              , 0
                              , '#33A908'
                              , '#A605C6'
                              , '2025-03-21 16:57:09'
                              , '2023-06-16 15:18:24'
                            )
                            , (
                              3
                              , 3
                              , '#FFFFFF'
                              , '#041660'
                              , '#000000'
                              , '#9F6BFF'
                              , '#EC6666'
                              , '#C5C5C5'
                              , 1
                              , '#FB4033'
                              , '#F6F6F6'
                              , '2025-04-01 15:43:52'
                              , '2023-06-16 15:18:55'
                            );

                          /*Table structure for table `theme_default` */

                          DROP TABLE
                          IF
                            EXISTS `theme_default`;

                            CREATE TABLE `theme_default` (
                              `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '编号'
                              , `menu_bg` varchar(225) DEFAULT NULL COMMENT '默认背景'
                              , `menu_sub_bg` varchar(225) DEFAULT NULL COMMENT '展开背景'
                              , `menu_text` varchar(225) DEFAULT NULL COMMENT '默认文字'
                              , `menu_active_text` varchar(225) DEFAULT NULL COMMENT '选中文字'
                              , `menu_sub_active_text` varchar(225) DEFAULT NULL COMMENT '当前选中展开文字'
                              , `menu_hover_bg` varchar(225) DEFAULT NULL COMMENT 'hover背景'
                              , `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
                              , `update_time` timestamp NULL DEFAULT NULL
                              ON
                              UPDATE
                                CURRENT_TIMESTAMP COMMENT '修改时间'
                                , PRIMARY KEY (`id`)
                            ) ENGINE = MyISAM AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8 ROW_FORMAT = DYNAMIC;

                            /*Data for the table `theme_default` */

                            insert into
                              `theme_default`(
                                `id`
                                , `menu_bg`
                                , `menu_sub_bg`
                                , `menu_text`
                                , `menu_active_text`
                                , `menu_sub_active_text`
                                , `menu_hover_bg`
                                , `create_time`
                                , `update_time`
                              )
                            values
                              (
                                1
                                , '#304156'
                                , '#304156'
                                , '#bfcad5'
                                , '#409eff'
                                , '#fff'
                                , '#001528'
                                , '2024-09-11 16:30:59'
                                , '2024-11-08 11:25:38'
                              );

                            /*Table structure for table `user` */

                            DROP TABLE
                            IF
                              EXISTS `user`;

                              CREATE TABLE `user` (
                                `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '编号'
                                , `name` varchar(255) NOT NULL DEFAULT '' COMMENT '名称'
                                , `url` varchar(1000) DEFAULT NULL COMMENT '头像'
                                , `status` int(11) NOT NULL DEFAULT '1' COMMENT '状态'
                                , `roles_id` varchar(255) NOT NULL DEFAULT '' COMMENT '角色编号'
                                , `remark` varchar(255) DEFAULT '' COMMENT '备注'
                                , `admin` int(11) NOT NULL DEFAULT '0' COMMENT '管理员'
                                , `pwd` varchar(255) NOT NULL DEFAULT '' COMMENT '密码'
                                , `more_id` int(11) DEFAULT NULL COMMENT '多账号编号'
                                , `update_time` timestamp NULL DEFAULT NULL
                                ON
                                UPDATE
                                  CURRENT_TIMESTAMP COMMENT '修改时间'
                                  , `create_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
                                  , PRIMARY KEY (`id`)
                              ) ENGINE = MyISAM AUTO_INCREMENT = 4 DEFAULT CHARSET = utf8;

                              /*Data for the table `user` */

                              insert into
                                `user`(
                                  `id`
                                  , `name`
                                  , `url`
                                  , `status`
                                  , `roles_id`
                                  , `remark`
                                  , `admin`
                                  , `pwd`
                                  , `more_id`
                                  , `update_time`
                                  , `create_time`
                                )
                              values
                                (
                                  1
                                  , 'admin'
                                  , '/默认文件夹/1742548031890003416154165499852-logo.jpg'
                                  , 1
                                  , '1'
                                  , '管理员'
                                  , 1
                                  , '63f6deb737ab85677d6f11beea14a08b'
                                  , NULL
                                  , '2025-04-01 09:30:47'
                                  , '2023-04-05 15:32:33'
                                )
                                , (
                                  2
                                  , '用户2'
                                  , '/默认文件夹/17425480378150005518768036639088-user.png'
                                  , 1
                                  , '12'
                                  , NULL
                                  , 0
                                  , '63f6deb737ab85677d6f11beea14a08b'
                                  , 8
                                  , '2025-04-01 09:30:49'
                                  , '2023-06-16 15:18:55'
                                )
                                , (
                                  3
                                  , '用户1'
                                  , '/默认文件夹/174254803781107569982284948242-wxChat.jpg'
                                  , 1
                                  , '13'
                                  , NULL
                                  , 0
                                  , '63f6deb737ab85677d6f11beea14a08b'
                                  , 5
                                  , '2025-04-01 09:30:52'
                                  , '2023-06-16 15:18:24'
                                );

                              /*!40101 SET SQL_MODE=@OLD_SQL_MODE */
;
                              /*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */
;
                              /*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */
;
                              /*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */
;