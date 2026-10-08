package com.MyFarm.view
{
   import com.MyFarm.control.Control;
   import com.MyFarm.data.UserInfo;
   import com._public._displayObject.IntroductionText;
   import com._public._method.app;
   import flash.display.DisplayObject;
   import flash.display.LoaderInfo;
   import flash.display.MovieClip;
   import flash.display.SimpleButton;
   import flash.display.Sprite;
   import flash.display.Stage;
   import flash.events.TimerEvent;
   import flash.net.SharedObject;
   import flash.system.ApplicationDomain;
   import flash.utils.Timer;
   
   public class InstallFace
   {
      
      private static var instance:InstallFace;
      
      private var _loaderInfo:LoaderInfo;
      
      public var _stage:Stage;
      
      public var _myMouse:MovieClip;
      
      private var myIntro:IntroductionText;
      
      public var _house:Sprite;
      
      public var _user:Object;
      
      public var _fence:Sprite;
      
      public var _warehouse:MovieClip;
      
      public var experienceBar:MovieClip;
      
      public var _showBox:MovieClip;
      
      public var _shop:MovieClip;
      
      public var _friends:Sprite;
      
      public var _title:Sprite = new Sprite();
      
      public var _farmland_array:Array = new Array();
      
      public var so:SharedObject = SharedObject.getLocal("test","/");
      
      private var control:Control;
      
      public var _kennel:Sprite;
      
      public var _tools:Sprite = new Sprite();
      
      public var cropXml:XML;
      
      public var _bg:Sprite = new Sprite();
      
      public var farmlandContainer:Sprite = new Sprite();
      
      private const EXP:uint = 100;
      
      private const PEST_TIME:Number = 14400;
      
      private const PEST_LOSS:uint = 2;
      
      private var ticker:Timer = new Timer(5000);
      
      public var _beijing:Sprite;
      
      public function InstallFace()
      {
         super();
      }
      
      public static function getInstance() : InstallFace
      {
         if(instance == null)
         {
            return instance = new InstallFace();
         }
         return instance;
      }
      
      public function set kennel(param1:String) : void
      {
         var _loc2_:Sprite = null;
         var _loc3_:Number = NaN;
         var _loc4_:Number = NaN;
         _loc2_ = createClip(param1);
         if(_loc2_ != null)
         {
            _loc3_ = _kennel.x;
            _loc4_ = _kennel.y;
            _bg.removeChild(_kennel);
            _kennel = _loc2_;
            _bg.addChild(_kennel);
            _kennel.x = _loc3_;
            _kennel.y = _loc4_;
         }
      }
      
      private function installToolsBar() : void
      {
         var _loc1_:Number = NaN;
         var _loc2_:Sprite = null;
         var _loc3_:SimpleButton = null;
         var _loc4_:IntroductionText = null;
         var _loc5_:SimpleButton = null;
         var _loc6_:IntroductionText = null;
         var _loc7_:Sprite = null;
         var _loc8_:SimpleButton = null;
         var _loc9_:IntroductionText = null;
         var _loc10_:SimpleButton = null;
         var _loc11_:IntroductionText = null;
         var _loc12_:SimpleButton = null;
         var _loc13_:IntroductionText = null;
         var _loc14_:SimpleButton = null;
         var _loc15_:IntroductionText = null;
         var _loc16_:SimpleButton = null;
         var _loc17_:IntroductionText = null;
         _stage.addChild(_tools);
         _loc2_ = createClip("ToolBarBg");
         _loc2_.name = "ToolBarBg";
         _tools.addChild(_loc2_);
         _loc3_ = createButton("Cursor");
         _loc3_.name = "CursorArrow";
         _loc1_ = (_loc2_.width - _loc3_.width * 7) / 8;
         _loc3_.x = _loc1_;
         _loc3_.y = -5;
         _loc4_ = new IntroductionText(_loc3_,_stage,{
            "titletext":"选择工具",
            "contenttext":"可以选取物品和拖动农场!"
         });
         _tools.addChild(_loc3_);
         _loc5_ = createButton("ButtonSeed");
         _loc5_.name = "ButtonSeed";
         _loc5_.x = _loc3_.x + _loc3_.width + _loc1_;
         _loc5_.y = -5;
         _loc6_ = new IntroductionText(_loc5_,_stage,{
            "titletext":"包袱",
            "contenttext":"存放已购买的种子!"
         });
         _tools.addChild(_loc5_);
         _loc7_ = createClip("PackBarBg");
         _loc7_.name = "PackBarBg";
         _loc7_.x = (_loc2_.width - _loc7_.width) / 2;
         _loc7_.y = -10 - _loc7_.height;
         _tools.addChild(_loc7_);
         showBurden();
         _loc7_.visible = false;
         _loc8_ = createButton("ButtonHoe");
         _loc8_.name = "CursorHoe";
         _loc8_.x = _loc5_.x + _loc5_.width + _loc1_;
         _loc8_.y = -5;
         _loc9_ = new IntroductionText(_loc8_,_stage,{
            "titletext":"铁锹",
            "contenttext":"可以用来翻地!"
         });
         _tools.addChild(_loc8_);
         _loc10_ = createButton("ButtonWater");
         _loc10_.name = "CursorWater";
         _loc10_.x = _loc8_.x + _loc8_.width + _loc1_;
         _loc10_.y = -5;
         _loc11_ = new IntroductionText(_loc10_,_stage,{
            "titletext":"浇水壶",
            "contenttext":"可以用来浇水防旱(Q)!"
         });
         _tools.addChild(_loc10_);
         _loc12_ = createButton("ButtonHook");
         _loc12_.name = "CursorHook";
         _loc12_.x = _loc10_.x + _loc10_.width + _loc1_;
         _loc12_.y = -5;
         _loc13_ = new IntroductionText(_loc12_,_stage,{
            "titletext":"除草剂",
            "contenttext":"可以用来除草(W)!"
         });
         _tools.addChild(_loc12_);
         _loc14_ = createButton("ButtonPesticide");
         _loc14_.name = "CursorPesticide";
         _loc14_.x = _loc12_.x + _loc12_.width + _loc1_;
         _loc14_.y = -5;
         _loc15_ = new IntroductionText(_loc14_,_stage,{
            "titletext":"杀虫剂",
            "contenttext":"可以用来杀虫(E)!"
         });
         _tools.addChild(_loc14_);
         _loc16_ = createButton("ButtonHand");
         _loc16_.name = "CursorHand";
         _loc16_.x = _loc14_.x + _loc14_.width + _loc1_;
         _loc16_.y = -5;
         _loc17_ = new IntroductionText(_loc16_,_stage,{
            "titletext":"手套",
            "contenttext":"用于收获果实(R)!"
         });
         _tools.addChild(_loc16_);
         _tools.x = (_stage.stageWidth - _tools.width) / 2;
         _tools.y = _stage.stageHeight - _loc2_.height - 10;
      }
      
      public function set user(param1:UserInfo) : void
      {
         _user = param1;
      }
      
      public function install() : void
      {
         _stage.addChild(_bg);
         _beijing = createClip("beijing");
         _beijing.x = -15;
         _bg.addChild(_beijing);
         _house = createClip(_user.house);
         _house.x = 580;
         _house.y = 250;
         _bg.addChild(_house);
         _fence = createClip(_user.fence);
         _fence.x = 380;
         _fence.y = 195;
         _bg.addChild(_fence);
         _kennel = createClip(_user.kennel);
         _kennel.x = 460;
         _kennel.y = 200;
         _bg.addChild(_kennel);
         _myMouse = createClip("CursorArrow");
         _myMouse.name = "CursorArrow";
         farmland();
         installToolsBar();
         installHead();
         theWeather();
         tick();
         ticker.addEventListener(TimerEvent.TIMER,tick);
         ticker.start();
      }
      
      public function reclaimedWasteland() : void
      {
         var _loc1_:uint = 0;
         var _loc2_:uint = 0;
         var _loc3_:MovieClip = null;
         var _loc4_:Number = NaN;
         var _loc5_:Number = NaN;
         var _loc6_:Sprite = null;
         while(_loc2_ < _user.farmland.length)
         {
            if(_user.farmland[_loc2_].farmland == "Wasteland")
            {
               _loc1_ = _loc2_;
               break;
            }
            _loc2_++;
         }
         _loc3_ = createClip("FarmlandS");
         _loc3_.name = "FarmlandS" + _loc1_;
         _loc4_ = Number(_farmland_array[_loc1_].x);
         _loc5_ = Number(_farmland_array[_loc1_].y);
         farmlandContainer.removeChild(_farmland_array[_loc1_]);
         _farmland_array[_loc1_] = _loc3_;
         farmlandContainer.addChild(_farmland_array[_loc1_]);
         _farmland_array[_loc1_].x = _loc4_;
         _farmland_array[_loc1_].y = _loc5_;
         _loc6_ = farmlandContainer.getChildByName("reclaim") as Sprite;
         if(_loc1_ < _user.farmland.length - 1)
         {
            _loc6_.x = _farmland_array[_loc1_ + 1].x + (_farmland_array[_loc1_ + 1].width - _loc6_.width) / 2;
            _loc6_.y = _farmland_array[_loc1_ + 1].y - _farmland_array[_loc1_ + 1].height / 3;
            farmlandContainer.setChildIndex(_loc6_,farmlandContainer.numChildren - 1);
         }
         else
         {
            farmlandContainer.removeChild(_loc6_);
         }
         _user.farmland[_loc1_].farmland = "FarmlandS";
         so.data.user = _user;
         so.flush();
      }
      
      private function installHead() : void
      {
         var _loc1_:Sprite = null;
         var _loc2_:Sprite = null;
         var _loc3_:SimpleButton = null;
         var _loc4_:IntroductionText = null;
         var _loc5_:SimpleButton = null;
         var _loc6_:IntroductionText = null;
         var _loc7_:SimpleButton = null;
         var _loc8_:IntroductionText = null;
         var _loc9_:SimpleButton = null;
         var _loc10_:IntroductionText = null;
         _loc1_ = createClip("HeadBg");
         _loc1_.x = (_stage.stageWidth - _loc1_.width) / 2;
         _title.addChild(_loc1_);
         _loc2_ = createClip("TipBg");
         _loc2_.y = (_loc1_.height - _loc2_.height) / 2;
         _loc2_.x = (_loc1_.height - _loc2_.height) / 2;
         _title.addChild(_loc2_);
         experienceBar = createClip("ExpBar");
         experienceBar.x = _loc2_.x + _loc2_.width + (_loc1_.height - _loc2_.height) / 2;
         experienceBar.y = (_loc1_.height - experienceBar.height) / 2;
         experienceBar.username.text = _user.username;
         experienceBar.username.mouseEnabled = false;
         experienceBar.wealth_txt.text = _user.wealth;
         experienceBar.wealth_txt.mouseEnabled = false;
         experienceBar.rank_txt.text = _user.rank;
         experienceBar.rank_txt.mouseEnabled = false;
         experienceBar.rank_txt.autoSize = "left";
         experienceBar.name = "experienceBar";
         _title.addChild(experienceBar);
         _loc3_ = createButton("ButtonDecorate");
         _loc3_.x = _stage.stageWidth - _loc3_.width - (_loc1_.height - _loc3_.height) / 2;
         _loc3_.y = (_loc1_.height - _loc3_.height) / 2;
         _loc5_ = createButton("ButtonShop");
         _loc5_.x = _loc3_.x + _loc3_.width - _loc5_.width;
         _loc5_.y = (_loc1_.height - _loc5_.height) / 2;
         _loc5_.name = "ButtonShop";
         _loc6_ = new IntroductionText(_loc5_,_stage,{
            "titletext":"商店",
            "contenttext":"可以购买一些你需要的物品!"
         });
         _title.addChild(_loc5_);
         _loc7_ = createButton("ButtonWarehouse");
         _loc7_.x = _loc5_.x - _loc7_.width - (_loc1_.height - _loc3_.height) / 2;
         _loc7_.y = (_loc1_.height - _loc7_.height) / 2;
         _loc7_.name = "ButtonWarehouse";
         _loc8_ = new IntroductionText(_loc7_,_stage,{
            "titletext":"仓库",
            "contenttext":"存放我的物品!"
         });
         _title.addChild(_loc7_);
         _loc9_ = createButton("ButtonFarm");
         _loc9_.x = _loc7_.x - _loc9_.width - (_loc1_.height - _loc3_.height) / 2;
         _loc9_.y = (_loc1_.height - _loc9_.height) / 2;
         _loc9_.name = "ButtonFarm";
         _loc10_ = new IntroductionText(_loc9_,_stage,{
            "titletext":"我的农场",
            "contenttext":"我的农场和作物!"
         });
         _title.addChild(_loc9_);
         _stage.addChild(_title);
         _shop = createClip("MyStore");
         _shop.name = "MyStore";
         _shop.x = (_stage.stageWidth - _shop.width) / 2;
         _shop.y = (_stage.stageHeight - _shop.height) / 2;
         _shop.tab1.buttonMode = true;
         _shop.tab2.buttonMode = true;
         _shop.tab3.visible = false;
         _stage.addChild(_shop);
         _shop.visible = false;
         _warehouse = createClip("warehouse");
         _warehouse.name = "warehouse";
         _warehouse.x = (_stage.stageWidth - _warehouse.width) / 2;
         _warehouse.y = (_stage.stageHeight - _warehouse.height) / 2;
         _warehouse.worth_txt.mouseEnabled = false;
         _stage.addChild(_warehouse);
         showWarehouse();
         _warehouse.visible = false;
         control = Control.getInstance();
         control.installControl();
         _stage.addChild(_myMouse);
         changeExp();
         myIntro = new IntroductionText(experienceBar,_stage,{
            "titletext":"等级: " + String(_user.rank),
            "contenttext":"当前经验: " + String(_user.experience) + " / " + String(int(_user.rank) * EXP)
         });
      }
      
      public function showBurden() : void
      {
         var _loc1_:Array = null;
         var _loc2_:Sprite = null;
         var _loc3_:Sprite = null;
         var _loc4_:uint = 0;
         var _loc5_:MovieClip = null;
         var _loc6_:Sprite = null;
         _loc1_ = _user.burden;
         _loc2_ = _tools.getChildByName("PackBarBg") as Sprite;
         if(_loc2_.getChildByName("container") != null)
         {
            _loc2_.removeChild(_loc2_.getChildByName("container"));
         }
         _loc3_ = new Sprite();
         _loc3_.name = "container";
         while(_loc4_ < _loc1_.length)
         {
            _loc5_ = createClip("ItemBg");
            _loc6_ = createClip(_loc1_[_loc4_].Items);
            _loc6_.name = _loc1_[_loc4_].Items;
            _loc5_.addChild(_loc6_);
            _loc5_.name = _loc1_[_loc4_].Items;
            _loc6_.x = (_loc5_.width - _loc6_.width) / 2;
            _loc6_.y = (_loc5_.height - _loc6_.height) / 2;
            _loc5_.x = (_loc2_.height - _loc5_.height) / 2 + (_loc5_.width + (_loc2_.height - _loc5_.height) / 2) * _loc4_;
            _loc5_.y = (_loc2_.height - _loc5_.height) / 2;
            _loc5_.txt.text = _loc1_[_loc4_].number;
            _loc5_.txt.mouseEnabled = false;
            _loc3_.addChild(_loc5_);
            _loc4_++;
         }
         _loc2_.addChild(_loc3_);
      }
      
      private function farmland() : void
      {
         var value:Array = null;
         var virgin:Boolean = false;
         var i:uint = 0;
         var farmland:MovieClip = null;
         var date:Date = null;
         var num:int = 0;
         var clip:Sprite = null;
         var k:uint = 0;
         var crop:DisplayObject = null;
         var reclaim:Sprite = null;
         value = _user.farmland;
         virgin = true;
         while(i < value.length)
         {
            farmland = createClip(value[i].farmland);
            farmland.name = value[i].farmland + i;
            _farmland_array.push(farmland);
            farmlandContainer.addChild(farmland);
            farmland.x = 254 - i % 3 * (farmland.width / 2 + 3) + (i / 3 >> 0) * farmland.width / 2;
            farmland.y = 284 + (i / 3 >> 0) * farmland.height / 2 + i % 3 * (farmland.height / 2 + 3);
            if(value[i].crop != undefined)
            {
               num = value[i].harvest == undefined ? int(grow(i)) : 6;
               clip = getChild(cropXml.items.(@seed == value[i].crop).@crop);
               clip.name = "xxxxxxxxx" + i;
               farmlandContainer.addChild(clip);
               clip.x = farmland.x;
               clip.y = farmland.y;
               showStage(i,num);
               _user.farmland[i].state = num;
            }
            if(value[i].farmland == "Wasteland" && virgin)
            {
               virgin = false;
               reclaim = createClip("Reclaim");
               reclaim.name = "reclaim";
               reclaim.x = farmland.x + (farmland.width - reclaim.width) / 2;
               reclaim.y = farmland.y - farmland.height / 3;
               farmlandContainer.addChild(reclaim);
            }
            i++;
         }
         _bg.addChild(farmlandContainer);
      }
      
      public function grow(param1:uint) : uint
      {
         var land:Object = _user.farmland[param1];
         var total:int = int(cropXml.items.(@seed == land.crop).@time);
         var age:int = int(new Date().time / 1000) - int(land.time);
         var stage:uint = age >= total ? 5 : uint(age * 5 / total);
         if(stage == 5)
         {
            if(land.yield == undefined)
            {
               land.yield = Math.max(1,cropXml.items.(@seed == land.crop).@yield - 3 + int(Math.random() * 6) - PEST_LOSS * pests(param1));
            }
            land.growth = "收获果实" + land.yield + "个,还剩" + land.yield + "个";
            land.progress = 1;
         }
         else
         {
            land.growth = "距离成熟还有" + transformationTime(total - age);
            land.progress = age / total;
         }
         land.state = stage;
         return stage;
      }
      
      public function farmlandChange(param1:uint, param2:String) : void
      {
         var old:MovieClip = _farmland_array[param1];
         var land:MovieClip = createClip(param2);
         land.name = param2 + param1;
         land.x = old.x;
         land.y = old.y;
         farmlandContainer.addChildAt(land,farmlandContainer.getChildIndex(old));
         farmlandContainer.removeChild(old);
         _farmland_array[param1] = land;
         _user.farmland[param1].farmland = param2;
      }
      
      public function showStage(param1:uint, param2:uint) : void
      {
         var clip:MovieClip = farmlandContainer.getChildByName("xxxxxxxxx" + param1) as MovieClip;
         var k:uint = 0;
         while(k < clip.numChildren)
         {
            clip.getChildAt(k).visible = k == param2;
            k++;
         }
      }
      
      public function pests(param1:uint) : uint
      {
         var land:Object = _user.farmland[param1];
         return (land.grass != undefined ? 1 : 0) + (land.worm != undefined ? 1 : 0) + (land.farmland == "FarmlandG" ? 1 : 0);
      }
      
      public function showPests(param1:uint) : void
      {
         overlay("Weed",param1,_user.farmland[param1].grass != undefined,30,25);
         overlay("Insect",param1,_user.farmland[param1].worm != undefined,120,45);
      }
      
      private function overlay(param1:String, param2:uint, param3:Boolean, param4:Number, param5:Number) : void
      {
         var old:DisplayObject = farmlandContainer.getChildByName(param1 + param2);
         var mc:MovieClip = null;
         if(param3 == (old != null))
         {
            return;
         }
         if(!param3)
         {
            farmlandContainer.removeChild(old);
            return;
         }
         mc = createClip(param1);
         mc.name = param1 + param2;
         mc.mouseEnabled = false;
         mc.mouseChildren = false;
         mc.x = _farmland_array[param2].x + param4;
         mc.y = _farmland_array[param2].y + param5;
         farmlandContainer.addChild(mc);
      }
      
      private function tick(param1:TimerEvent = null) : void
      {
         var now:int = int(new Date().time / 1000);
         var chance:Number = 1 - Math.exp(-(now - int(_user.checked != undefined ? _user.checked : now)) / PEST_TIME);
         var changed:Boolean = false;
         var i:uint = 0;
         var land:Object = null;
         var before:uint = 0;
         _user.checked = now;
         while(i < _user.farmland.length)
         {
            land = _user.farmland[i];
            if(land.crop != undefined && land.harvest == undefined)
            {
               before = uint(land.state);
               if(before < 5)
               {
                  if(land.grass == undefined && Math.random() < chance)
                  {
                     land.grass = 1;
                     changed = true;
                  }
                  if(land.worm == undefined && Math.random() < chance)
                  {
                     land.worm = 1;
                     changed = true;
                  }
                  if(land.farmland == "FarmlandS" && Math.random() < chance)
                  {
                     farmlandChange(i,"FarmlandG");
                     changed = true;
                  }
               }
               if(grow(i) != before)
               {
                  showStage(i,uint(land.state));
                  changed = true;
               }
               showPests(i);
            }
            i++;
         }
         if(changed)
         {
            so.data.user = _user;
            so.flush();
         }
      }
      
      public function set loaderInfo(param1:LoaderInfo) : void
      {
         _loaderInfo = param1;
      }
      
      private function theWeather() : void
      {
         var _loc1_:Date = null;
         var _loc2_:String = null;
         var _loc3_:Number = NaN;
         var _loc4_:MovieClip = null;
         var _loc5_:IntroductionText = null;
         var _loc6_:Number = NaN;
         _loc1_ = new Date();
         _loc3_ = _loc1_.getHours();
         if(_loc3_ > 6 && _loc3_ < 18)
         {
            if(_user.weather == undefined)
            {
               _loc6_ = Math.random();
               if(_loc6_ > 0.5)
               {
                  _loc2_ = "Rain";
               }
               else
               {
                  _loc2_ = "Sunny";
               }
               _user.weather = _loc2_;
            }
            else
            {
               _loc2_ = _user.weather;
            }
         }
         else
         {
            _loc2_ = "Night";
            _user.weather == undefined;
         }
         _loc4_ = createClip(_loc2_);
         switch(_loc2_)
         {
            case "Rain":
               _loc5_ = new IntroductionText(_loc4_,_stage,{
                  "titletext":"雨天",
                  "contenttext":"雨天地里不会干旱!"
               });
               break;
            case "Sunny":
               _loc5_ = new IntroductionText(_loc4_,_stage,{
                  "titletext":"晴天",
                  "contenttext":"炎热的天气小心地里干旱!"
               });
               break;
            case "Night":
               _loc5_ = new IntroductionText(_loc4_,_stage,{
                  "titletext":"夜晚",
                  "contenttext":"小心晚上出动的小偷!"
               });
         }
         _loc4_.x = (_stage.stageWidth - _loc4_.width) / 2;
         _title.addChild(_loc4_);
      }
      
      public function showWarehouse() : void
      {
         var _loc1_:Array = null;
         var _loc2_:uint = 0;
         var _loc3_:MovieClip = null;
         var _loc4_:Sprite = null;
         var _loc5_:int = 0;
         var _loc6_:uint = 0;
         var _loc7_:MovieClip = null;
         var _loc8_:Sprite = null;
         _loc1_ = _user.warehouse;
         _loc2_ = 18;
         _loc3_ = _stage.getChildByName("warehouse") as MovieClip;
         if(_loc3_.getChildByName("container") != null)
         {
            _loc3_.removeChild(_loc3_.getChildByName("container"));
         }
         _loc4_ = new Sprite();
         _loc4_.name = "container";
         while(_loc6_ < _loc1_.length)
         {
            _loc7_ = createClip("ItemBg");
            _loc8_ = createClip(_loc1_[_loc6_].fruit);
            _loc8_.name = "bg" + _loc6_;
            _loc7_.addChild(_loc8_);
            _loc7_.name = "bg" + _loc6_;
            _loc8_.x = (_loc7_.width - _loc8_.width) / 2;
            _loc8_.y = (_loc7_.height - _loc8_.height) / 2;
            _loc7_.x = 15 + _loc6_ % int((_loc3_.width - _loc2_) / (_loc7_.width + _loc2_)) * (_loc7_.width + _loc2_);
            _loc7_.y = 65 + (_loc6_ / int((_loc3_.width - _loc2_) / (_loc7_.width + _loc2_)) >> 0) * (_loc7_.width + _loc2_);
            _loc7_.txt.text = _loc1_[_loc6_].number;
            _loc7_.txt.mouseEnabled = false;
            _loc7_.buttonMode = true;
            _loc5_ += int(_loc1_[_loc6_].number) * int(_loc1_[_loc6_].price);
            _loc4_.addChild(_loc7_);
            _loc6_++;
         }
         _loc3_.worth_txt.text = _loc5_;
         _loc3_.addChild(_loc4_);
      }
      
      public function changeExp() : void
      {
         if(int(_user.experience) < int(_user.rank) * EXP)
         {
            experienceBar.bar.width = int(int(_user.experience) / (int(_user.rank) * EXP) * 120);
         }
         else
         {
            _user.experience = int(_user.experience) - int(_user.rank) * EXP;
            _user.rank = int(_user.rank) + 1;
            experienceBar.bar.width = int(int(_user.experience) / (int(_user.rank) * EXP) * 120);
         }
         experienceBar.username.text = _user.username;
         experienceBar.wealth_txt.text = _user.wealth;
         experienceBar.rank_txt.text = _user.rank;
         if(myIntro != null)
         {
            myIntro.infoObject = {
               "title":"等级: " + String(_user.rank),
               "content":"当前经验: " + String(_user.experience) + " / " + String(int(_user.rank) * EXP)
            };
         }
      }
      
      public function set fence(param1:String) : void
      {
         var _loc2_:Sprite = null;
         var _loc3_:Number = NaN;
         var _loc4_:Number = NaN;
         _loc2_ = createClip(param1);
         if(_loc2_ != null)
         {
            _loc3_ = _fence.x;
            _loc4_ = _fence.y;
            _bg.removeChild(_fence);
            _fence = _loc2_;
            _bg.addChild(_fence);
            _fence.x = _loc3_;
            _fence.y = _loc4_;
         }
      }
      
      public function changeMouse(param1:String) : void
      {
         var _loc2_:MovieClip = null;
         var _loc3_:Number = NaN;
         var _loc4_:Number = NaN;
         _loc2_ = createClip(param1);
         if(_loc2_ != null)
         {
            _loc3_ = _myMouse.x;
            _loc4_ = _myMouse.y;
            _stage.removeChild(_myMouse);
            _myMouse = _loc2_;
            _myMouse.x = _loc3_;
            _myMouse.y = _loc4_;
            _stage.addChild(_myMouse);
            _myMouse.name = param1;
         }
      }
      
      public function getChild(param1:String) : MovieClip
      {
         return createClip(param1);
      }
      
      private function createClip(param1:String) : MovieClip
      {
         var _loc2_:MovieClip = null;
         var _loc3_:ApplicationDomain = null;
         _loc3_ = _loaderInfo.applicationDomain;
         _loc2_ = app.createMc(param1,_loc3_);
         if(_loc2_ == null)
         {
            _loc2_ = null;
         }
         return _loc2_;
      }
      
      public function set house(param1:String) : void
      {
         var _loc2_:Sprite = null;
         var _loc3_:Number = NaN;
         var _loc4_:Number = NaN;
         _loc2_ = createClip(param1);
         if(_loc2_ != null)
         {
            _loc3_ = _house.x;
            _loc4_ = _house.y;
            _bg.removeChild(_house);
            _house = _loc2_;
            _bg.addChild(_house);
            _house.x = _loc3_;
            _house.y = _loc4_;
         }
      }
      
      private function createButton(param1:String) : SimpleButton
      {
         var _loc2_:SimpleButton = null;
         var _loc3_:ApplicationDomain = null;
         _loc3_ = _loaderInfo.applicationDomain;
         _loc2_ = app.createButton(param1,_loc3_);
         if(_loc2_ == null)
         {
            _loc2_ = null;
         }
         return _loc2_;
      }
      
      public function transformationTime(param1:uint) : String
      {
         var _loc2_:Number = NaN;
         var _loc3_:Number = NaN;
         var _loc4_:Number = NaN;
         _loc2_ = int(param1 / 3600);
         _loc3_ = int((param1 - _loc2_ * 3600) / 60);
         _loc4_ = param1 - _loc2_ * 3600 - _loc3_ * 60;
         return _loc2_ + "小时" + _loc3_ + "分钟" + _loc4_ + "秒";
      }
   }
}

