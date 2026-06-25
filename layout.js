var mcSession = {
  //存储
  set: function (key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
  },
  //取出数据
  get: function (key) {
    const res = sessionStorage.getItem(key);
    return res != 'undefined' ? JSON.parse(res) : '';
  },
  // 删除数据
  remove: function (key) {
    sessionStorage.removeItem(key);
  }
};
var Layout = {
  url: {
    api: window.Menu.$SiteDomain_MP,
    static: window.Menu.$SiteDomain_Res,
    pmsn: window.Menu.$SiteDomain_PMSN,
    passport: window.Menu.$SiteDomain_Passport
  },
  //运营平台siteID都是2
  menu_data: {
    AppID: null,
    SiteID: 2,
    GroupID: 0,
    SubGroupID: 0,
    MallID: 0,
    ShopID: 0
  },
  otherlist: ['首页', '积分规则配置', '付费会员'],
  enum_appid: {
    mgroupID: '15',
    mallID: '5',
    operatorID: '4',
  },
  icons: {
    0: 'micon-home',
    1: 'micon-operate',
    3: 'micon-transaction',
    4: 'micon-configure',
    5: 'micon-member',
    6: 'micon-service',
    7: 'micon-page',
    8: 'micon-manage',
    12: 'micon-marketing',
    11: 'micon-log',
  },
  userdata: {},
  MallInfo: {},
  MallLogo: '',
  groupID: '',//不是集团id,是代表一级菜单高亮
  mgroupID: '',//集团id
  mallID: '',
  sysId: 2,//运营层菜单ID,默认值2 展开“商场管理”(https://mp-t.mallcoo.cn/Mall/List/)
  CustomerServiceUrl: '',//帮助弹框组件里的客服链接地址
  init: function () {

    var appId = '4';
    //运营平台https://mp-t.mallcoo.cn/MallGroup/List/ AppID是4，SiteID是2（参数没有mallID,没有mgroupID）
    var mgroupID = +this.GetParam("mgroupID");
    var subgroupID = +this.GetParam("subgroupID");
    var mallID = +this.GetParam("mallID");
    var pageMenuData = window.Menu_Data || {};

    this.groupID = +this.GetParam("groupID") || 0;
    this.mgroupID = mgroupID;
    this.mallID = mallID;

    if (mallID) {
      //运营平台https://mp-t.mallcoo.cn/Mall/?mallID=11620&groupID=0 AppID是5，SiteID是2（参数有mallID,没有mgroupID。线上交易SiteID-13；商场服务SiteID-7；营销中心SiteID-20，这个SiteID好像有问题，应该是12？；日志中心SiteID-38）
      appId = this.enum_appid['mallID'];
      this.menu_data.MallID = mallID;

    } else if (mgroupID) {
      //运营平台https://mp-t.mallcoo.cn/MallGroup/MallList?mgroupID=575 AppID是15，SiteID是2（参数没有mallID,有mgroupID）
      appId = this.enum_appid['mgroupID'];
      this.menu_data.GroupID = mgroupID;

    } else if (subgroupID) {
      //云crm才有subgroupID概念
      this.menu_data.subgroupID = subgroupID;
    }


    this.menu_data.AppID = pageMenuData.menuAppId || appId;
    this.menu_data.SiteID = pageMenuData.menuSiteId || 0;
    this.menu_data.Version = pageMenuData.version || '';

    // this.menu_data.AppID = $('appId').val() || 6;
    // this.menu_data.SiteID = $('siteId').val() || 5;

    this.getCur();
    this.eventList();


  },
  initHelpDialog: function () {
    var $that = this;
    var serviceSrc = this.url.api + "a/publicpage/service?mallID=" + this.mallID + '&v=' + Date.now()
    var $iframe = '<div class="nav-dobj" id="navDobj"><iframe src=' + serviceSrc + ' id="iframewindowService" class="nav-sobj" @load="loadServiceHandle" name="publicpage"></iframe></div>'

    $('#rightMenu').after($iframe);

    var $body = $('body');
    var $navDobj = $('#navDobj');
    var $iframewindowService = $('#iframewindowService');

    $iframewindowService.height(window.innerHeight)

    $('#rightTop').on('click', '#mpHelp', function () {
      $that.postMessage({ isShow: true })
      $navDobj.css("width", 545)
      $body.addClass('lockbody')
    });

    var PageUrl = location.href.split("?")[0];

    $iframewindowService.on('load', function (e) {

      e.target.contentWindow.postMessage(
        {
          type: 'mp-pagedocmessage',
          fromSource: { CustomerServiceUrl: $that.CustomerServiceUrl, PageUrl: PageUrl },
        },
        '*'
      )
    })

    window.onresize = function () {
      $iframewindowService.height(window.innerHeight)
    }

  },
  getServiceMessage: function () {
    var $body = $('body');
    var $navDobj = $('#navDobj');

    window.addEventListener('message', function (e) {
      var type = e.data.type
      var fromSource = e.data.fromSource
      if (type == 'mp-servicemessage') {
        let isShow = fromSource.isShow

        if (!isShow) {
          setTimeout(function () {
            $body.removeClass('lockbody')
            $navDobj.css("width", 0)
          }, 500)
        }
      }
    })
  },
  postMessage: function (data) {
    $('#iframewindowService')[0].contentWindow.postMessage(
      {
        type: 'mp-pagedocmessage',
        fromSource: data,
      },
      '*'
    )
  },
  GetParam: function (paramName, search) {
    var reg = new RegExp("(^|&)" + paramName + "=([^&]*)(&|$)", 'i'); //构建一个含有目标参数的正则表达式对象
    var search = search ? search : window.location.search
    var r = search.substr(1).match(reg);//匹配目标参数
    if (r != null) {
      return decodeURIComponent(r[2]); //返回参数值
    }
    return null;
  },
  eventList: function () {
    var that = this,
      $sideBar = $('#sideBar'),
      $pageCon = $("#pageCon"),
      $rightTop = $('#rightTop');

    //一级
    $sideBar.on('click', ".sidelist_fir li", function () {

      var $this = $(this),
        isGo = $this.data('item'),
        idx = $this.index() || that.siteID,
        $cur = $sideBar.find(".sidelistall").eq(idx);
      var $toggleBtn = $('#togglebtn');

      if (!isGo) {
        $this.addClass('cur').siblings('li').removeClass('cur')
      }

      $cur.find('.initcur').find('.sidebar_third').stop(true, true);
      $cur.show().siblings(":not('.msidelogo')").find('li').removeClass('active').find('.sidebar_third').slideUp().end().end().hide();

      if (idx) {
        $('#leftMenu > .msidelogo-home').hide();
        $toggleBtn.show().parent().next('.mallname').css('marginLeft', '14px')
        $toggleBtn.removeClass("micon-toggleright").addClass("micon-toggleleft");
        $pageCon.removeClass("hideSidebar");
      } else {
        $('#leftMenu > .msidelogo-home').show();
        $toggleBtn.hide().parent().next('.mallname').css('marginLeft', '0px')
        $toggleBtn.removeClass("micon-toggleleft").addClass("micon-toggleright");
        $pageCon.addClass("hideSidebar");
      }

      if (idx == that.siteID) {
        $cur.find('li:not(".initcur")').removeClass('active').find('.sidebar_third').hide();
        $cur.find(".initcur").removeClass('initcur-inactive').find('.sidebar_third').show();
      }

    });

    // $sideBar.on('mouseleave', ".sidelist_fir li", function (event) {
    //   event.stopPropagation();
    //   // var $cur = $("#sideBar .sidelistall");
    //   // $cur.find('.initcur').find('.sidebar_third').stop(true, true);
    // });

    // //sidelist_sec(营销中心运营层)
    // $sideBar.on('mouseleave', '.sidelist_fir,.sidelistall', function () {
    //   that.initCurMenu();
    // });

    // $sideBar.on('mouseleave', '.msidenav', function () {
    //   that.initSysCurMenu();
    // });

    // $sideBar.on('mouseenter', '.sidelist_bot', function () {
    //   that.initCurMenu();
    // });

    //二级
    $sideBar.on('click', ".sidelist_sec .secitem-title,.sidelist_sec .micon-jiantouyou", function () {
      var $this = $(this),
        $li = $this.parent('li'),
        $ul = $this.parents('.sidelist_sec');

      if ($li.hasClass('initcur')) {
        $li.toggleClass('initcur-inactive');
      } else {
        $li.toggleClass('active');
      }
      if ($li.hasClass('initcur-inactive')) {
        $this.siblings(".sidebar_third").hide();
      } else {
        $this.siblings(".sidebar_third").show();
      }

      if (!$li.hasClass('initcur')) {
        if ($li.hasClass('active')) {
          $this.siblings(".sidebar_third").show();
        } else {
          $this.siblings(".sidebar_third").hide();
        }
      }

      //$ul.siblings('.sidelist_sec').children('li.initcur').addClass('initcur-inactive');
      //$ul.siblings('.sidelist_sec').children('li').removeClass('active').find('.sidebar_third').hide();
    });

    //显示隐藏左边菜单
    $rightTop.on('click', '.togmenu', function () {
      var $this = $(this),
        mType = $this.data('mtype'),
        $toggleBtn = $('#togglebtn'),
        $pageCon = $("#pageCon");

      var $cur = $sideBar.find(".sidelistall").eq(that.siteID);

      if ($toggleBtn.hasClass("micon-toggleleft")) {
        $toggleBtn.removeClass("micon-toggleleft").addClass("micon-toggleright");
        switch (mType) {
          case 1:
            $pageCon.addClass("hideSidebar");
            $cur.find(".initcur").addClass('initcur-inactive').find('.sidebar_third').slideUp();
            break;
          //mp后台商场层首页
          case 2:
            $pageCon.addClass("hideSidebar");
            //$pageCon.addClass("hideSidebar2");
            break;
          case 3:
            $pageCon.addClass("hideSidebar3");
            break;
        }

      } else {
        $toggleBtn.removeClass("micon-toggleright").addClass("micon-toggleleft");
        switch (mType) {
          case 1:
            $pageCon.removeClass("hideSidebar");
            $cur.find(".initcur").removeClass('initcur-inactive').find('.sidebar_third').slideDown();
            break;
          //mp后台商场层首页
          case 2:
            $pageCon.removeClass("hideSidebar");
            //$pageCon.removeClass("hideSidebar2");
            break;
          case 3:
            $pageCon.removeClass("hideSidebar3");
            $sideBar.find(".sidelist_sec li:not('.initcur')").removeClass('active').find('.sidebar_third').slideUp();
            $sideBar.find(".initcur").removeClass('initcur-inactive').find('.sidebar_third').slideDown();
            break;
        }


      }
    })
    $rightTop.on('click', '.signout', function () {
      sessionStorage && sessionStorage.clear();
    })

    //展开消息&用户信息
    $rightTop.on("mouseenter", ".item_mes,.item_user", function () {
      $(this).find(".scon").show();
    }).on("mouseleave", ".item_mes,.item_user", function () {
      $(this).find(".scon").hide();
    });

  },
  initCurMenu: function () {
    var $cur = $('#sideBar').find(".sidelistall").eq(this.siteID);//sidelist_sec(营销中心运营层)
    $cur.find('.initcur').find('.sidebar_third').stop(true, true);
    $cur.show().siblings(":not('.msidelogo')").hide();
    $cur.find('li:not(".initcur")').removeClass('active').find('.sidebar_third').slideUp();
    $cur.find(".initcur").removeClass('initcur-inactive').find('.sidebar_third').slideDown();
  },
  initSysCurMenu: function () {
    var that = this;
    var $secitem = $('#sideBar').find(".sidelist_sec");
    var $cur = $('#sideBar').find(".sidelist_sec").eq(that.sysSiteId);//sidelist_sec(营销中心运营层)
    $secitem.find('li:not(".initcur")').removeClass('active').find('.sidebar_third').slideUp();
    $cur.find('.initcur').find('.sidebar_third').stop(true, true);
    $cur.find(".initcur").removeClass('initcur-inactive').find('.sidebar_third').slideDown();
  },
  getMenu: function (menudata, key, val) {
    var that = this;

    $.ajax({
      type: 'POST',
      url: this.url.api + 'api/auth/Frame/Menu/GetMenu',
      dataType: "json",
      xhrFields: { withCredentials: true },
      crossDomain: true,
      contentType: 'application/json;charset=utf-8',
      data: JSON.stringify(menudata),
      success: function (res) {
        if (res.m == 1) {
          mcSession.set(key, res);
          mcSession.set('mcMallID', that.mallID);
          that.menuHandle(menudata, res, val)

        }
      }
    });
  },
  menuHandle: function (menudata, res, val) {
    var that = this;
    var result = res.d,
      groupID = that.groupID,//不是集团id,是定位一级菜单高亮的值
      sideBarTpl = doT.template(that.sideBarTpl);

    result.MenuList.forEach(function (item) {
      //val==1说明是商场层首页，菜单都可以点击跳转
      if (val == 1) {
        //首页改成菜单点击都不跳转了
        item.isGo = ''
        //item.isGo = 1
      } else {
        if (that.otherlist.indexOf(item.Title) != -1) {
          item.isGo = 1;
        } else {
          item.isGo = ''
        }
      }
    });

    result.groupID = groupID;
    result.icons = that.icons;
    result.MallLogo = that.MallLogo;
    result.url = that.url;
    result.logoText = "运营平台";

    if (menudata.AppID == 6 && menudata.SiteID == 5) {
      result.logoText = "云CRM"
    }
    if (menudata.AppID == 11 && menudata.SiteID == 23) {
      result.logoText = "云CRM"
    }

    that.initSecAndThirdMenu(result.MenuList)//数据操作高亮
    var html = sideBarTpl(result);
    $('#sideBar').html(html);
    that.initFirstMenu(result.MenuList);//dom操作高亮

  },
  getSysMenu: function (data) {
    var that = this;
    $.ajax({
      type: 'POST',
      url: this.url.api + 'api/auth/Frame/Menu/GetMenu',
      dataType: "json",
      xhrFields: { withCredentials: true },
      crossDomain: true,
      contentType: 'application/json;charset=utf-8',
      data: JSON.stringify(data),
      success: function (res) {
        if (res.m == 1) {
          var result = res.d,
            sideBarSysTpl = doT.template(that.sideBarSysTpl);

          result.logoText = "运营平台"
          if (data.AppID == 10 && data.SiteID == 23) {
            result.logoText = "会员管理系统"
          }
          if (data.AppID == 8 && data.SiteID == 23) {
            result.logoText = "会员管理系统"
          }

          that.initSysMenu(result.MenuList)
          result.sysId = that.sysId;
          result.url = that.url;
          var html = sideBarSysTpl(result);
          $('#sideBar').html(html);
        }
      }
    });
  },
  initSysMenu: function (menus) {
    var that = this;
    var href = location.href,
      pageUrl = href.split('?')[0].split('//')[1];
    if (pageUrl.lastIndexOf('/') == pageUrl.length - 1) {
      pageUrl = pageUrl.slice(0, pageUrl.length - 1)
    }
    var arr = pageUrl.split('/'),
      lastvalue = arr[arr.length - 1];

    if (/^\d+$/.test(lastvalue) || lastvalue == '') {
      arr.splice(arr.length - 1);
      pageUrl = arr.join('/');
    }

    $.each(menus, function (i, o) {
      var omenus = o.ChildMenuList || [];
      $.each(omenus, function (ii, oo) {
        var ooUrl = oo.Url.split('?')[0].split('//')[1];
        if (ooUrl.lastIndexOf('/') == ooUrl.length - 1) {
          ooUrl = ooUrl.slice(0, ooUrl.length - 1)
        }
        var ooarr = ooUrl && ooUrl.split('/') || [],
          oolastvalue = ooarr[ooarr.length - 1];
        if (oolastvalue == '') {
          ooarr.splice(ooarr.length - 1);
          ooUrl = ooarr.join('/');
        }

        if (ooUrl.toLocaleLowerCase() == pageUrl.toLocaleLowerCase()) {
          that.sysSiteId = i;
          that.sysId = o.ID;
          o.active = true;
          if (oo.IsDisPlay) {
            oo.active = true;
          } else {
            for (var t = ii; t--; t >= 0) {
              if (omenus[t].IsDisPlay) {
                omenus[t].active = true;
                break;
              }
            }
          }
          return false;
        }
      })
    })
  },
  initSecAndThirdMenu: function (menus) {
    var that = this;
    var pageUrl = location.href.split('?')[0].split('//')[1];
    if (pageUrl.lastIndexOf('/') == pageUrl.length - 1) {
      pageUrl = pageUrl.slice(0, pageUrl.length - 1)
    }
    var arr = pageUrl.split('/'),
      lastvalue = arr[arr.length - 1];
    var pageChannel = this.GetParam("channel");
    var isSpecChannel = this.GetParam("isSpecChannel");

    if (/^\d+$/.test(lastvalue)) {
      arr.splice(arr.length - 1);
      pageUrl = arr.join('/');
    }

    $.each(menus, function (i, o) {
      var omenus = o.ChildMenuList || [];
      $.each(omenus, function (ii, oo) {
        var oomenus = oo.ChildMenuList || [];
        $.each(oomenus, function (iii, ooo) {
          var oooUrl = ooo.Url.split('?')[0].split('//')[1];
          if (oooUrl.lastIndexOf('/') == oooUrl.length - 1) {
            oooUrl = oooUrl.slice(0, oooUrl.length - 1)
          }
          if (isSpecChannel) {
            var oooSearch = ooo.Url.split('?')[1];
            var oooChanel = oooSearch && that.getParam('channel', oooSearch)
            if (ooo.IsDisPlay && oooChanel == pageChannel) {
              oo.active = true;
              ooo.active = true
              return false;
            }
          }
          else if (oooUrl.toLocaleLowerCase() == pageUrl.toLocaleLowerCase()) {
            oo.active = true;
            if (ooo.IsDisPlay) {
              ooo.active = true;
            } else {
              for (var t = iii; t--; t >= 0) {
                if (oomenus[t].IsDisPlay) {
                  oomenus[t].active = true;
                  break;
                }
              }
            }
            return false;
          }
        })
      })
    });
  },
  initFirstMenu: function (menus) {
    var siteID = 1,
      groupID = this.groupID;//不是集团id,是定位一级菜单高亮的值

    for (var i = 0; i < menus.length; i++) {
      var item = menus[i]
      if (item.GroupID == groupID) {
        siteID = i;
        this.siteID = i;
        break;
      }
    }

    $("#sideBar .sidelistall").eq(siteID).show().siblings(":not('.msidelogo')").removeClass("fadeIn").hide();
  },
  getCur: function () {
    var data = {},
      that = this;
    var mallId = this.mallID;
    var mgroupID = this.mgroupID;
    var groupId = this.groupID;
    var menudata = that.menu_data;
    var menutype = { mall: 0, mallindex: 1 }//0是商场层菜单，1是商场层首页

    $.ajax({
      type: 'POST',
      url: this.url.api + 'api/auth/User/Basic/GetCurrentUser',
      dataType: "json",
      xhrFields: { withCredentials: true },
      crossDomain: true,
      contentType: 'application/json;charset=utf-8',
      data: JSON.stringify(data),
      success: function (res) {
        var data = res.d || {};
        if (res.m == 1) {
          if (data.Avatar) data.Avatar = that.formatImgUrl(data.Avatar, 200, 200);
          that.userdata = data;
          var $container = $('#container');

          if (mallId && groupId) {
            $container.addClass('mcontainer-mall');
            that.getMallMenu(menudata, menutype.mall);
          }

          if (mallId && !groupId) {
            //首页菜单改成更商场层一样的显示；
            $container.addClass('mcontainer-mall');
            $('#pageCon').addClass("hideSidebar");
            //$('#container').addClass('mcontainer-nomall')
            that.getMallMenu(menudata, menutype.mallindex);
          }

          if (!mallId) {
            $container.removeClass('mcontainer').addClass('mcontainer-sys');
            that.getSysMenu(menudata);
            that.getBasic(false);
          }
        }
      }
    });
  },
  getMallMenu: function (menudata, val) {
    var mallID = this.mallID;
    var key = menudata.AppID + menudata.SiteID + menudata.Version;
    var res = mcSession.get(key);
    var mcMallID = mcSession.get('mcMallID')

    if (!res || mcMallID != mallID) {
      this.getMenu(menudata, key, val);
    } else {
      this.menuHandle(menudata, res, val)
    }
    //第一个参数传就代表是商场层，第二个参数代表是否是商场层首页
    this.getBasic(true, val);
  },
  getBasic: function (isMall, isMallIndex) {
    var that = this,
      mallId = this.mallID,
      mgroupID = this.mgroupID,
      groupID = this.groupID;//不是集团id,是代表一级菜单高亮

    var data = { GroupID: mgroupID, MallID: mallId };
    $.ajax({
      type: 'POST',
      url: this.url.api + 'api/auth/Frame/Basic/GetBasic',
      dataType: "json",
      xhrFields: { withCredentials: true },
      crossDomain: true,
      contentType: 'application/json;charset=utf-8',
      data: JSON.stringify(data),
      success: function (res) {
        var data = res.d || { MallInfo: {} },
          logo = data.MallInfo && data.MallInfo.MallLogo || '';

        if (res.m == 1) {
          that.MallInfo = res.d.MallInfo || {}
          data.user = that.userdata;
          if (!mallId) {
            data.MallToDoList = [];
            data.MallInfo = {};
          }
          data.groupID = groupID;
          data.url = that.url;
          that.CustomerServiceUrl = data.CustomerServiceUrl
          that.MallLogo = logo && that.formatImgUrl(logo, 42, 42) || that.url.static + 'mp/images/syslogo.jpg';
          $('#sideBar .msidelogo img').attr('src', that.MallLogo)
          that.leftTplHandle(data);

          data.api = that.url.api;
          data.pmsn = that.url.pmsn;
          data.passport = that.url.passport;
          data.callbackurl = that.url.callbackurl;
          data.msgCount = data.MallToDoList && data.MallToDoList.reduce(function (total, item) { return total + item.Count }, 0)
          data.isMall = isMall;
          data.isMallIndex = isMallIndex;
          //var rightTpl = doT.template($("#rightTpl").html());
          var rightTpl = doT.template(that.rightTpl);
          var html = rightTpl(data);
          $('#rightMenu').html(html);

          that.initHelpDialog();
          that.getServiceMessage();

          that.getMallMaintInfo();

          //that.getMenu(that.menu_data);
        } else {
          var href = encodeURI(location.href),
            pmsn = that.url.pmsn,
            passport = that.url.passport,
            mp = that.url.api,
            code = res.m;

          switch (code) {
            case 320:
              location.replace(passport + "login?callbackUrl=" + href);
              break;
            case 100:
              location.replace(mp + "Mall/MallTips?mallID=" + mallId);
              break;
            case 101:
              location.replace(pmsn + "Home/MallError?callbackUrl=" + href);
              break;
            case 102:
              location.replace(pmsn + "Home/ShopError?callbackUrl=" + href);
              break;
            default:
              location.replace(pmsn + "Home/PermissionError?callbackUrl=" + href);
              break;
          }
          that.getMallMaintInfo();

        }
      }
    });
  },
  getMallMaintInfo: function() {
    var that = this
    var mallId = that.mallID
    if(!mallId) {
      that.InitUserly()
      return
    }
    var data = { mallId: mallId };
    $.ajax({
      type: 'POST',
      url: this.url.api + 'api/pms/maint/getMallMaintInfo',
      dataType: "json",
      xhrFields: { withCredentials: true },
      crossDomain: true,
      contentType: 'application/json;charset=utf-8',
      data: JSON.stringify(data),
      success: function (res) {
        if (res.m == 1) {
          var wbEndTime = res.d.data.endTime
          that.InitUserly(wbEndTime)
        } else {
          that.InitUserly()
        }
      }
    });
  },
  InitUserly: function(endTime) {
    return
    var that = this
    var userData = that.userdata
    var visitorId = userData.ID
    var userName = userData.name
    var userType = userData.AuthType
    var mallId = that.mallID
    var mallName = that.MallInfo && that.MallInfo.MallName ? that.MallInfo.MallName : ''
    var wbEndTime = endTime || ''
    var prop = {
      accountId: '1579454873914953730',
      token: '+Hm/miDbwNl+vwxuYJwPVA==',
      visitorId, // 用户id
      userType, // 用户类型
      mallName, // 商场名称
      mallId, // 商场id
      userName, // 用户名
      wbEndTime // 维保到期时间
    }
    that.setUserlyHandle(prop)
  },
  setUserlyHandle(prop) {
    (function(i){if(i!==null&&i!==void 0&&i.userlyAPIInited){return}if(i!==null&&i!==void 0&&i.userlyAPILoaded){n()}else if(i!==null&&i!==void 0&&i.addEventListener){i.addEventListener("Userly.UserClient.onLoad",n)}function n(){var n;if(i!==null&&i!==void 0&&(n=i.userlyAPI)!==null&&n!==void 0&&n.init){i.
      userlyAPI.init(prop);i.userlyAPIInited=true}}})(window);
  },
  leftTplHandle: function (data) {
    var that = this;
    var mType = 1,//默认1是商场层；2是商场层的首页；3是只有展开收缩两级菜单
      mallId = this.mallID,
      mgroupID = this.mgroupID,
      groupID = this.groupID;//不是集团id,是代表一级菜单高亮

    if (!groupID) {
      mType = 2
    }
    if (!mallId) {
      mType = 3
    }

    data.mType = mType;
    data.url = that.url;

    //集团层，把MallGroupInfo赋值给MallInfo
    if (mgroupID) {
      data.MallToDoList = []
      data.MallInfo = { MallName: data.MallGroupInfo.GroupName }
    }

    //var leftTpl = doT.template($("#leftTpl").html());
    var leftTpl = doT.template(this.leftTpl);
    var html = leftTpl(data);
    $('#leftMenu').html(html);

    if (!groupID && mType == 2) {
      var $togglebtn = $('#togglebtn');
      $togglebtn.hide().parent().next('.mallname').css('marginLeft', 0)
      $togglebtn.removeClass("micon-toggleleft").addClass("micon-toggleright");
    }

  },
  sideBarSysTpl: '<div class="msidebar-sys">' +
    '<div class="msidebar_sec">' +
    '<a class="msidelogo" href="{{=it.url.api}}">' +
    '{{=it.logoText}}' +
    //'<img src="{{=it.url.static}}/mp/images/sidelogo.png" />' +
    '</a>' +
    '<div class="msidenav">' +
    '<div class="msidenav-in">' +
    '{{~it.MenuList:item}}' +
    '<ul class="sidelist_sec">' +
    '<li class="{{=item.ID==it.sysId?"initcur":""}}">' +
    '<i class="micon-jiantouyou"></i>' +
    '<span class="secitem-title">{{=item.Title}}</span>' +
    '<dl class="sidebar_third">' +
    '{{~item.ChildMenuList:secitem}}' +
    '{{?secitem.IsDisPlay}}' +
    '<dd class="{{=secitem.active?"cur":""}}">' +
    '<a href="{{=secitem.Url}}"  target="{{=item.Target}}">{{=secitem.Title}}</a>' +
    '</dd>' +
    '{{?}}' +
    '{{~}}' +
    '</dl>' +
    '</li>' +
    '</ul>' +
    '{{~}}' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>',
  sideBarTpl: '<div class="msidebar">' +
    '<div class="msidebar_fir">' +
    '<div class="msidelogo">' +
    '{{? it.MallLogo}}' +
    '<img src="{{=it.MallLogo}}">' +
    '{{??}}' +
    '<img src="{{=it.url.static}}mp/images/syslogo.jpg">' +
    '{{?}}' +
    '</div>' +
    '<ul class="sidelist_fir">' +
    '{{~it.MenuList:item}}' +
    '<li class="{{=item.GroupID==it.groupID?"cur":""}}" data-item="{{=item.isGo}}">' +
    '<a href="{{=item.isGo==1?item.Url:"javascript:void(0)"}}" target="{{=item.Target}}">' +
    '<span class="menu-imgicon"><i class="{{=it.icons[item.GroupID]}}"></i></span>' +
    '<span class="menu-txt">{{=item.Title}}</span>' +
    '</a>' +
    '</li>' +
    '{{~}}' +
    '</ul>' +
    '<div class="sidelist_bot"></div>' +
    '</div>' +
    //'{{? it.groupID}}' +
    '<div class="msidebar_sec">' +
    '<a class="msidelogo" href="{{=it.url.api}}">' +
    '{{=it.logoText}}' +
    //'<img src="{{=it.url.static}}/mp/images/sidelogo-mall.jpg" />' +
    '</a>' +
    '{{~it.MenuList:item}}' +
    '<div class="sidelistall">' +
    '{{~item.ChildMenuList:secitem}}' +
    '<ul class="sidelist_sec">' +
    '<li class="{{=secitem.active?"initcur":""}}">' +
    '<i class="micon-jiantouyou"></i>' +
    '<span class="secitem-title">{{=secitem.Title}}</span>' +
    '<dl class="sidebar_third">' +
    '{{~secitem.ChildMenuList:thirditem}}' +
    '{{?thirditem.IsDisPlay}}' +
    '<dd class="{{=thirditem.active?"cur":""}}">' +
    '<a href="{{=thirditem.Url}}"  target="{{=thirditem.Target}}">{{=thirditem.Title}}</a>' +
    '</dd>' +
    '{{?}}' +
    '{{~}}' +
    '</li>' +
    '</ul>' +
    '{{~}}' +
    '</div>' +
    '{{~}}' +
    '</div>' +
    //'{{?}}' +
    '</div>',
  leftTpl: '{{? it.mType==2}}<a class="msidelogo-home" href="{{=it.url.api}}">运营平台</a>{{?}}{{? it.mType}}<div class="togmenu" data-mtype="{{=it.mType}}"><i class="micon-toggleleft" id="togglebtn"></i></div>{{?}}{{? it.MallInfo.MallName}}<span class="mallname">{{=it.MallInfo.MallName}}</span>{{?}}',
  rightTpl: '<div class="rightmenu">' +

    '{{? it.MallToDoList.length}}' +
    '<div class="item item_mes">' +
    '<div class="swrapper">' +
    '<i class="micon-information"></i>消息<span class="newmes">{{=it.msgCount>99?"99+":it.msgCount}}</span>' +
    '</div>' +
    '<div class="scon">' +
    '<div class="mname">待处理事项</div>' +
    '<div class="sinfo" id="sinfolist">' +
    '{{~it.MallToDoList:item}}' +
    '<div class="bar">' +
    '<a href="{{=item.Url}}">' +
    '{{=item.Name}}' +
    '<em class="tag">{{=item.Count}}</em>' +
    '</a>' +
    '</div>' +
    '{{~}}' +
    '</div>' +
    '</div>' +
    '</div>' +
    '{{?}}' +
    '{{? it.CustomerServiceUrl}}' +
    '<div class="item item_ask">' +
    '<a href="{{=it.CustomerServiceUrl}}" class="ask-btn" target="_blank"><i class="micon-consulting"></i>咨询</a>' +
    '</div>' +
    '{{?}}' +
    '{{? it.isMall&&it.isMallIndex!=1}}' +
    '<div class="item">' +
    '<div class="swrapper service-container right-menu-item hover-effect" id="mpHelp">' +
    '<i class="micon-question-circle"></i>' +
    '<span class="message-service">帮助</span>' +
    '</div>' +
    '</div>' +
    '{{?}}' +
    '<div class="item item_user">' +
    '<div class="swrapper">' +
    '{{? it.user.Avatar}}' +
    '<img src="{{=it.user.Avatar}}" class="userpic" />' +
    '{{?? !it.user.Avatar}}' +
    '<img src="{{=it.url.static}}mp/images/photo-default.png"" class="userpic" />' +
    '{{?}}' +
    '{{? it.user.NickName}}' +
    '<span class="username">{{=it.user.NickName}}</span>' +
    '{{?? it.user.Name}}' +
    '<span class="username">{{=it.user.Name}}</span>' +
    '{{?}}' +
    '<i class="arrow-b"></i>' +
    '</div>' +
    '<div class="scon">' +
    '<div class="sinfo">' +
    '<div class="bar"><a href="{{=it.pmsn}}Account/Info/">个人信息</a></div>' +
    '<div class="bar"><a href="{{=it.pmsn}}Account/Password/">修改密码</a></div>' +
    '</div>' +
    '<a class="signout" href="{{=it.passport}}LoginOut?callbackUrl={{=it.callbackurl}}">退出登录</a>' +
    '</div>' +
    '</div>' +
    '</div>',
  /**
  * 格式化图片Url
  * @param value 图片地址
  * @param width 宽度
  * @param height 高度
  * @param type 默认3 =>  0:等比缩放；1：裁剪；2：补白；3：以宽度为准进行等比缩放；4：以高度为准进行等比缩放
  * @param quality 图片质量（1--100）
  * @param folder 格式(jpg、png),如果格式为“_raw”则取原格式（jpg/png）
  */
  formatImgUrl: function (value, width, height, type, quality, folder) {
    var $DynamicImagePath = location.href.indexOf('mp-t') > -1 ? 'https://i1-t.mallcoo.cn' : 'https://i1.mallcoo.cn';

    type = type || 0;
    quality = quality || 90;
    width = width || 100;
    height = height || 100;
    // http 全地址 直接返回
    var reg = /^http|^\/\//;
    if (reg.test(value)) {
      return value;
    }
    var _imgUrl = "";
    var arr = value.toString().split("/");
    var folders = arr[arr.length - 1].split(".");
    var _folder = folders[folders.length - 1];

    if (folder === "png") {
      _folder = "png";
    } else if (!folder && _folder === "png") {
      _folder = "jpg";
    }
    folders.pop();
    var len = folders.join('').split('-')[0].length;
    arr[arr.length - 1] = folders.join("");

    for (var i = arr.length - 1; i >= 0; i--) {
      if ((len == 2 && i >= arr.length - 4) || (len == 8 && i >= arr.length - 1)) {
        _imgUrl = arr[i] + _imgUrl;
      } else {
        _imgUrl = arr[i] + "/" + _imgUrl;
      }
    }

    //_imgUrl = `${$DynamicImagePath}/${_imgUrl}_${width}x${height}_${type}_0_${quality}.${_folder}`;
    _imgUrl = $DynamicImagePath + '/' + _imgUrl + '_' + width + 'x' + height + '_' + type + '_0_' + quality + '.' + _folder
    return _imgUrl;
  }
}

var MCLayoutCommon = {
  init: function () {
    $('body').append(this.$modal_tip);
    $('body').append(this.$_ffConfirm);
    this.eventList();
  },
  $modal_tip: '<div class="modal fade" id="modal_tip" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">' +
    '<div class="modal-dialog">' +
    '<div class="modal-content">' +
    '<div class="modal-header">' +
    '<button type="button" class="close" data-dismiss="modal" aria-hidden="true"></button>' +
    '<h4 class="modal-title">提示</h4>' +
    '</div>' +
    '<div class="modal-body">' +
    '<p id="modal_tip_body" style="word-break: break-all; width: 500px; overflow: hidden;"></p>' +
    '</div>' +
    '<div class="modal-footer hide">' +
    '<button type="button" class="btn blue">保存</button>' +
    '<button type="button" class="btn default" data-dismiss="modal">关闭</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>',
  $_ffConfirm: '<div id="_ffConfirm" aria-hidden="true" tabindex="-1" class="modal fade" style="display: none;" data-backdrop="static">' +
    '<div class="modal-dialog">' +
    '<div class="modal-content">' +
    '<div class="modal-header" style="padding: 15px;">' +
    '<b>提示</b>' +
    '</div>' +
    '<div class="modal-body">' +
    '你已超过<span id="notice_minute"></span>分钟未做任何操作，请重新登录' +
    '</div>' +
    '<div class="modal-footer">' +
    '<a href="javascript:window.location.reload();" class="btn blue">确认</a>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>',
  eventList: function () {
    //绑定菜单跳转事件
    $(document).delegate("a[data-href]", "click", function () {
      var href = $(this).attr("data-href");
      var target = $(this).attr("target");
      if (href) {
        var groupID = App.getQueryStringByName("groupID");
        if (groupID) {
          if (href.indexOf("groupID") < 0) {
            //window.location.href = href + "&groupID=" + groupID;
            href = href + "&groupID=" + groupID;
          }
          else {
            //window.location.href = href;
          }

        } else {
          //window.location.href = href;
        }
        if (target == "_blank") {
          window.open(href);
        }
        else {
          window.location.href = href;
        }
      }
    });
    //var parms = encodeURI("<%= Data.CustomerServiceParams %>");
    $("#customerService").click(function () {
      var hr = $(this).attr("data-href");
      if (hr) {
        window.open(hr);
      }
    });
  }
}

var MCAutoLoginOut = {
  url: {
    api: window.Menu.$SiteDomain_MP,
  },
  init: function () {
    this.getAuthConfig();
  },
  getAuthConfig: function () {
    var that = this;
    $.ajax({
      type: 'GET',
      url: this.url.api + 'api/auth/Frame/Basic/GetAuthConfig',
      dataType: "json",
      xhrFields: { withCredentials: true },
      crossDomain: true,
      contentType: 'application/json;charset=utf-8',
      success: function (res) {
        var d = res.d || {}
        if (res.m == 1 && d.IsAutoLogOut) {
          that._settimeFF(res);
        }
      }
    });
  },
  _settimeFF: function (res) {
    var that = this;
    var OnlineTime = res.d.AutoLogOutMinute;

    $("#notice_minute").html(OnlineTime);
    document.onmousemove = function () {
      if (timeFn(that._getCookieVal("_Leisure")) > 5) {
        that._setCookie("_Leisure", new Date().toUTCString());
      }
    }
    var interCount = setInterval(function () {
      if (timeFn(that._getCookieVal("_Leisure")) >= parseInt(OnlineTime) * 60) {
        clearInterval(interCount);
        clearCookie();
      }
    }, 1000);

    function clearCookie() {
      localStorage.clear();
      sessionStorage.clear();
      var keys = document.cookie.match(/[^ =;]+(?=\=)/g);
      var domain = _getDome();

      if (keys) {
        for (var i = keys.length; i--;) {
          document.cookie = keys[i] + '=0;path=/;domain=' + domain + ';expires=' + new Date(0).toUTCString();
        }
      }

      $("#_ffConfirm").modal("show");
    }

    function timeFn(d1) {//di作为一个变量传进来
      if (d1 == null) {
        return;
      }
      var dateBegin = new Date(d1.replace(/-/g, "/"));//将-转化为/，使用new Date
      var dateEnd = new Date();//获取当前时间
      var dateDiff = dateEnd.getTime() - dateBegin.getTime();//时间差的毫秒数
      var leave1 = dateDiff % (24 * 3600 * 1000)    //计算天数后剩余的毫秒数
      var leave2 = leave1 % (3600 * 1000)    //计算小时数后剩余的毫秒数
      //计算相差秒数
      //console.log("计算相差秒数" + parseInt(leave2 / 1000));
      return parseInt(leave2 / 1000);
    }
  },
  _getDome: function () {
    var domain = document.domain;
    if (domain.indexOf("mp") != 0) {
      var len = domain.length;
      var start = domain.indexOf(".");
      domain = domain.substr(start, len);
    }
    if (domain.indexOf(".") != 0) {
      domain = "." + domain;
    }
    return domain;
  },
  _getCookieVal: function (name) {
    var val = document.cookie.replace(/(?:(?:^|.*;\s*)_Leisure\s*\=\s*([^;]*).*$)|^.*$/, '$1');
    return val;
  },
  _setCookie: function (name, val) {
    document.cookie = name + "= " + val + "; path=/;domain=" + this._getDome();
  }

}

//url跳转
function JumpUrl(href) {
  var groupID = App.getQueryStringByName("groupID");
  if (groupID) {
    if (href.indexOf("groupID") < 0) {
      window.location.href = location.origin + href + "&groupID=" + groupID;
    }
    else {
      window.location.href = location.origin + href;
    }

  } else {
    window.location.href = location.origin + href;
  }

};

// userly
function setUserlySDK() {
  (function(e,t,n){var l="userly-client-init";if(null===t.getElementById(l)){var a=t.getElementsByTagName(n)[0],i=t.createElement(n);i.async=1,i.defer=1,i.src="//app.userly.cn/assets/InitializationSDK.bundle.js?t=".concat((new Date).getTime()),i.id=l,i.onload=function(){if(null!=e&&e.userlyAPI){e.userlyAPILoaded=!0;var n=null;t.createEvent?(n=t.createEvent("Event")).initEvent("Userly.UserClient.onLoad",!0,!0):t.createEventObject&&((n=t.createEventObject()).eventType=eventName),t.dispatchEvent&&n?t.dispatchEvent(n):t.fireEvent&&n&&t.fireEvent("Userly.UserClient.onLoad",n)}else{var l,a;null==e||null===(l=e.console)||void 0===l||null===(a=l.log)||void 0===a||a.call(l,"Userly SDK Fail to load")}},a.parentNode.insertBefore(i,a)}})(window,document,"script");
}

$(document).ready(function () {
  Layout.url.callbackurl = encodeURIComponent(location.href);
  Layout.init();
  MCLayoutCommon.init();
  MCAutoLoginOut.init();
  setUserlySDK();
})
