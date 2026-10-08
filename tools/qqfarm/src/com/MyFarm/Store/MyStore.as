package com.MyFarm.Store
{
   import com.MyFarm.Store.view.DisplayBox;
   import com.MyFarm.Store.view.ShowBox;
   import com.MyFarm.view.InstallFace;
   import com._public._method.ClearMemory;
   import flash.display.DisplayObject;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.display.Stage;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.filters.ColorMatrixFilter;
   import flash.net.URLLoader;
   import flash.net.URLRequest;
   
   public class MyStore
   {
      
      private var container:Sprite = new Sprite();
      
      private var margins:Number = 20;
      
      private var box:DisplayBox;
      
      private var interval:Number = 20;
      
      private var stage:Stage;
      
      private var showBox:ShowBox;
      
      private var _showBoxArr:Array;
      
      private var install:InstallFace = InstallFace.getInstance();
      
      private var currentXML:XML;
      
      private var currentTab:String;
      
      private var rank:uint = 1;
      
      private var shown:Boolean = true;
      
      private var xml_array:Array = new Array();
      
      private var myBox:MovieClip;
      
      public function MyStore(param1:MovieClip, param2:Stage, param3:Array)
      {
         super();
         stage = param2;
         _showBoxArr = param3;
         myBox = param1;
         xml_array["tab1"] = "com/MyFarm/data/xml/seed.xml";
         xml_array["tab2"] = "com/MyFarm/data/xml/props.xml";
         init();
      }
      
      private function tweenComplete() : void
      {
         myBox.parent.removeChild(myBox);
      }
      
      private function init() : void
      {
         myBox.tab1.buttonMode = true;
         myBox.tab2.buttonMode = true;
         myBox.tab3.buttonMode = true;
         myBox.tab1.gotoAndStop(2);
         currentTab = "tab1";
         addListen();
         loaderXML(xml_array["tab1"]);
         container.name = "container";
         myBox.addChild(container);
         myBox.addEventListener(Event.ENTER_FRAME,refresh);
      }
      
      private function refresh(param1:Event) : void
      {
         if(myBox.visible == shown)
         {
            return;
         }
         shown = myBox.visible;
         rank = int(install._user.rank);
         if(shown && currentXML != null)
         {
            clear();
            getXML(currentXML);
         }
      }
      
      private function loaderXML(param1:String) : void
      {
         var _loc2_:URLLoader = null;
         _loc2_ = new URLLoader(new URLRequest(param1));
         _loc2_.addEventListener(Event.COMPLETE,loadXMLComplete);
      }
      
      private function buySomething(param1:uint, param2:Number) : void
      {
         var _loc3_:uint = 0;
         var _loc4_:uint = 0;
         var _loc5_:int = 0;
         var _loc6_:uint = 0;
         var item:XML = currentXML.item[param1];
         var obj:String = String(item.@object);
         _loc3_ = int(currentTab.slice(3,4)) - 1;
         if(param2 <= int(install._user.wealth))
         {
            _loc4_ = param2 / int(item.@price);
            if(obj.indexOf("Fertilizer") == 0 && obj.charAt(obj.length - 1) == "P")
            {
               obj = obj.slice(0,-1);
               item = currentXML.item.(@object == obj)[0];
               _loc4_ *= 7;
            }
            install._user.wealth = int(install._user.wealth) - param2;
            _loc5_ = -1;
            while(_loc6_ < install._user.burden.length)
            {
               if(install._user.burden[_loc6_].Items == item.@object)
               {
                  _loc5_ = int(_loc6_);
                  break;
               }
               _loc6_++;
            }
            if(_loc5_ > -1)
            {
               install._user.burden[_loc5_].number = int(install._user.burden[_loc5_].number) + _loc4_;
            }
            else
            {
               install._user.burden.push({
                  "name":String(item.@name),
                  "Items":String(item.@object),
                  "number":_loc4_
               });
            }
            install.showBurden();
            install.changeExp();
            _showBoxArr[_loc3_].info.text = "";
            showBox.close();
            install.so.data.user = install._user;
            install.so.flush();
            clear();
            getXML(currentXML);
            bought(String(item.@name) + " ×" + _loc4_,param2);
         }
         else
         {
            _showBoxArr[_loc3_].info.text = "元宝不足!!!";
         }
      }
      
      private function addListen() : void
      {
         myBox.tab1.addEventListener(MouseEvent.CLICK,tabChange);
         myBox.tab2.addEventListener(MouseEvent.CLICK,tabChange);
         myBox.tab3.addEventListener(MouseEvent.CLICK,tabChange);
      }
      
      public function set currentRank(param1:uint) : void
      {
         rank = param1;
      }
      
      private function getXML(param1:XML) : void
      {
         var _loc2_:Number = Number(NaN);
         var _loc3_:uint = 0;
         var _loc4_:uint = 0;
         var _loc5_:uint = 0;
         var _loc6_:MovieClip = null;
         currentXML = param1;
         _loc2_ = myBox.tab1.y + myBox.tab1.height + margins;
         myBox.scrollBar.y = _loc2_;
         container.y = 0;
         _loc3_ = uint(int((myBox.width - margins * 2) / (50 + interval)));
         var order:Array = new Array();
         var gray:Array = [new ColorMatrixFilter([0.3,0.59,0.11,0,0,0.3,0.59,0.11,0,0,0.3,0.59,0.11,0,0,0,0,0,0.5,0])];
         var k:uint = 0;
         while(k < param1.item.length())
         {
            if(canBuy(param1.item[k]))
            {
               order.push(k);
            }
            k++;
         }
         k = 0;
         while(k < param1.item.length())
         {
            if(!canBuy(param1.item[k]))
            {
               order.push(k);
            }
            k++;
         }
         while(_loc5_ < order.length)
         {
            k = uint(order[_loc5_]);
            if(param1.item[k].@url != undefined)
            {
               box = new DisplayBox(param1.item[k].@url,stage,param1.item[k].@price,null,param1.item[k].@name,param1.item[k].@information);
            }
            else
            {
               _loc6_ = createClip(param1.item[k].@object);
               box = new DisplayBox("",stage,param1.item[k].@price,_loc6_,param1.item[k].@name,param1.item[k].@information);
            }
            box.name = k.toString();
            if(!canBuy(param1.item[k]))
            {
               box.filters = gray;
            }
            box.x = (box.width + interval) * _loc4_ + margins;
            box.y = _loc2_;
            _loc4_++;
            if((_loc5_ + 1) % _loc3_ == 0)
            {
               _loc2_ += box.height + margins;
               _loc4_ = 0;
            }
            container.addChild(box);
            _loc5_++;
         }
         container.addEventListener(MouseEvent.CLICK,clickHandler);
         myBox.scrollBar.effectObject = "container";
      }
      
      private function bought(param1:String, param2:Number) : void
      {
         var tip:MovieClip = createClip("Tips2");
         tip.txt.text = "购买成功！" + param1 + "，花费" + param2 + "元宝";
         tip.txt.mouseEnabled = false;
         tip.cancel.visible = false;
         tip.define.x = (tip.define.x + tip.cancel.x) / 2;
         tip.define.addEventListener(MouseEvent.CLICK,closeTip);
         tip.close_btn.addEventListener(MouseEvent.CLICK,closeTip);
         stage.addChild(tip);
         tip.x = myBox.x + (myBox.width - tip.width) / 2;
         tip.y = myBox.y + (300 - tip.height) / 2;
      }
      
      private function closeTip(param1:MouseEvent) : void
      {
         var tip:MovieClip = param1.currentTarget.parent as MovieClip;
         tip.parent.removeChild(tip);
      }
      
      private function canBuy(param1:XML) : Boolean
      {
         return int(param1.@rank) <= rank && int(param1.@price) <= int(install._user.wealth);
      }
      
      private function tabChange(param1:MouseEvent) : void
      {
         var _loc2_:MovieClip = null;
         if(param1.target.name == currentTab)
         {
            return;
         }
         switch(param1.target.name)
         {
            case "tab1":
            case "tab2":
            case "tab3":
               clear();
               loaderXML(xml_array[param1.target.name]);
               _loc2_ = myBox.getChildByName(currentTab) as MovieClip;
               if(_loc2_ != null)
               {
                  _loc2_.gotoAndStop(1);
               }
               currentTab = param1.target.name;
               param1.target.gotoAndStop(2);
         }
      }
      
      private function clickHandler(param1:MouseEvent) : void
      {
         var _loc2_:uint = 0;
         var _loc3_:uint = 0;
         var _loc4_:Object = null;
         var _loc5_:MovieClip = null;
         // The item box is named after its index; a click may land on the box itself or anything nested in it.
         var hit:DisplayObject = param1.target as DisplayObject;
         while(hit != null && hit.parent != container)
         {
            hit = hit.parent;
         }
         if(hit == null)
         {
            return;
         }
         _loc2_ = int(currentTab.slice(3,4)) - 1;
         _loc3_ = uint(int(hit.name));
         _loc4_ = new Object();
         _loc4_.price = currentXML.item[_loc3_].@price;
         _loc4_.name = currentXML.item[_loc3_].@name;
         _loc4_.information = currentXML.item[_loc3_].@information;
         _loc4_.type = currentXML.item[_loc3_].@type;
         _loc4_.maturation = currentXML.item[_loc3_].@maturation;
         _loc4_.experience = currentXML.item[_loc3_].@experience;
         _loc4_.rank = currentXML.item[_loc3_].@rank;
         _loc4_.yield = currentXML.item[_loc3_].@yield;
         _loc4_.prices = currentXML.item[_loc3_].@prices;
         _loc4_.info = currentXML.item[_loc3_];
         _loc4_.id = _loc3_;
         _loc4_.revenue = Number(_loc4_.yield) * Number(_loc4_.prices);
         if(_loc2_ == 0)
         {
            if(int(_loc4_.rank) > rank)
            {
               _showBoxArr[_loc2_].define.mouseEnabled = false;
               _showBoxArr[_loc2_].info.text = "等级不够，无法购买!";
            }
            else
            {
               _showBoxArr[_loc2_].define.mouseEnabled = true;
               _showBoxArr[_loc2_].info.text = "";
            }
         }
         else if(_loc2_ != 1)
         {
            if(_loc2_ == 2)
            {
            }
         }
         _showBoxArr[_loc2_].info.mouseEnabled = false;
         if(currentXML.item[_loc3_].@url != undefined)
         {
            showBox = new ShowBox(_showBoxArr[_loc2_],currentTab,currentXML.item[_loc3_].@url,null,_loc4_,buySomething);
         }
         else
         {
            _loc5_ = createClip(currentXML.item[_loc3_].@object);
            showBox = new ShowBox(_showBoxArr[_loc2_],currentTab,"",_loc5_,_loc4_,buySomething);
         }
         stage.addChild(_showBoxArr[_loc2_]);
         _showBoxArr[_loc2_].x = myBox.x + (myBox.width - _showBoxArr[_loc2_].width) / 2;
         _showBoxArr[_loc2_].y = myBox.y + (300 - _showBoxArr[_loc2_].height) / 2;
         showBox.beginShow();
      }
      
      private function loadXMLComplete(param1:Event) : void
      {
         getXML(XML(param1.target.data));
      }
      
      public function clearMemory() : void
      {
         var _loc1_:ClearMemory = null;
         _loc1_ = ClearMemory.getInstance();
         myBox.tab1.removeEventListener(MouseEvent.CLICK,tabChange);
         myBox.tab2.removeEventListener(MouseEvent.CLICK,tabChange);
         myBox.tab3.removeEventListener(MouseEvent.CLICK,tabChange);
         myBox.removeEventListener(Event.ENTER_FRAME,refresh);
         box = null;
         while(container.numChildren > 0)
         {
            container.removeChildAt(0);
         }
         container = null;
         currentXML = null;
         myBox = null;
         _showBoxArr = new Array();
         stage = null;
         _loc1_.runClear();
      }
      
      private function clear() : void
      {
         var _loc1_:uint = 0;
         _loc1_ = uint(container.numChildren);
         while(_loc1_ > 0)
         {
            container.removeChildAt(_loc1_ - 1);
            _loc1_--;
         }
      }
      
      private function createClip(param1:String) : MovieClip
      {
         return install.getChild(param1);
      }
   }
}

