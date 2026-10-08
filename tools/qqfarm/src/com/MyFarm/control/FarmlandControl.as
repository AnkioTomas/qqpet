package com.MyFarm.control
{
   import com.MyFarm.view.InstallFace;
   import com._public._displayObject.Card;
   import flash.display.DisplayObject;
   import flash.display.DisplayObjectContainer;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.MouseEvent;
   import flash.ui.Mouse;
   
   public class FarmlandControl
   {
      
      private static const FERTILIZER:Object = {
         "Fertilizer":7200,
         "FertilizerFast":12600,
         "FertilizerVeryFast":18000,
         "FertilizerFastP":12600,
         "FertilizerVeryFastP":18000
      };
      
      private static const CARE_EXP:uint = 2;
      
      private var bg:Sprite;
      
      private var num:Number;
      
      private var crop:DisplayObjectContainer;
      
      private var count:uint;
      
      private var myCard:Card = new Card();
      
      private var face:InstallFace = InstallFace.getInstance();
      
      private var progress:MovieClip;
      
      private var tips:MovieClip;
      
      public function FarmlandControl()
      {
         super();
         face.farmlandContainer.addEventListener(MouseEvent.MOUSE_OVER,farmlandOverHandler);
         face.farmlandContainer.addEventListener(MouseEvent.CLICK,farmlandClickHandler);
         face._stage.addChild(myCard);
      }
      
      private function tipsCloseHandler(param1:MouseEvent = null) : void
      {
         Mouse.hide();
         face._myMouse.visible = true;
         face._stage.removeChild(tips);
         face._stage.removeChild(bg);
         tips.define.removeEventListener(MouseEvent.CLICK,tipsDefineHandler);
         tips.cancel.removeEventListener(MouseEvent.CLICK,tipsCloseHandler);
         tips.close_btn.removeEventListener(MouseEvent.CLICK,tipsCloseHandler);
         tips = null;
         bg = null;
      }
      
      private function createShape(param1:Number, param2:Number) : Sprite
      {
         var _loc3_:Sprite = null;
         _loc3_ = new Sprite();
         _loc3_.graphics.beginFill(0,0);
         _loc3_.graphics.drawRect(0,0,param1,param2);
         _loc3_.graphics.endFill();
         return _loc3_;
      }
      
      private function cropMouseOut(param1:MouseEvent) : void
      {
         face._stage.removeChild(progress);
         param1.target.removeEventListener(MouseEvent.ROLL_OUT,cropMouseOut);
      }
      
      private function farmlandOutHandler(param1:MouseEvent) : void
      {
         var _loc2_:MovieClip = null;
         param1.target.removeEventListener(MouseEvent.MOUSE_OUT,farmlandOutHandler);
         _loc2_ = param1.target as MovieClip;
         if(_loc2_ != null)
         {
            _loc2_.gotoAndStop(1);
         }
      }
      
      private function farmlandClickHandler(param1:MouseEvent) : void
      {
         var event:MouseEvent = param1;
         var str:String = String(event.target.name).slice(0,9);
         var land:Object = null;
         var tool:String = face._myMouse.name;
         var clip:Sprite = null;
         var being:Number = NaN;
         var m:uint = 0;
         if(event.target.parent.name == face.farmlandContainer.name)
         {
            num = Number(String(event.target.name).slice(9,String(event.target.name).length));
         }
         else
         {
            num = Number(String(event.target.parent.name).slice(9,String(event.target.parent.name).length));
         }
         if(str == "Wasteland" || event.target == face.farmlandContainer.getChildByName("reclaim"))
         {
            return;
         }
         land = face._user.farmland[num];
         if(tool == "CursorHoe")
         {
            if(land.crop == undefined)
            {
               tip("不允许对空地进行操作!");
            }
            else if(land.harvest == undefined)
            {
               Mouse.show();
               face._myMouse.visible = false;
               tips = face.getChild("Tips2");
               bg = createShape(face._stage.stageWidth,face._stage.stageHeight);
               face._stage.addChild(bg);
               face._stage.addChild(tips);
               tips.x = (face._stage.stageWidth - tips.width) / 2;
               tips.y = (face._stage.stageHeight - tips.height) / 2;
               tips.txt.text = "是否确定要铲除!!!";
               tips.txt.mouseEnabled = false;
               tips.define.addEventListener(MouseEvent.CLICK,tipsDefineHandler);
               tips.cancel.addEventListener(MouseEvent.CLICK,tipsCloseHandler);
               tips.close_btn.addEventListener(MouseEvent.CLICK,tipsCloseHandler);
            }
            else
            {
               dig();
            }
         }
         else if(tool == "CursorWater")
         {
            if(land.farmland != "FarmlandG")
            {
               tip("这块地不用浇水!");
            }
            else
            {
               face.farmlandChange(num,"FarmlandS");
               reward("浇水成功");
            }
         }
         else if(tool == "CursorHook")
         {
            if(land.grass == undefined)
            {
               tip("这块地不用除草!");
            }
            else
            {
               delete land.grass;
               face.showPests(num);
               reward("除草成功");
            }
         }
         else if(tool == "CursorPesticide")
         {
            if(land.worm == undefined)
            {
               tip("这块地不用杀虫!");
            }
            else
            {
               delete land.worm;
               face.showPests(num);
               reward("杀虫成功");
            }
         }
         else if(tool == "CursorHand")
         {
            if(land.crop == undefined || land.harvest != undefined || face.grow(num) != 5)
            {
               tip("这块地没有东西可收获!");
               return;
            }
            face.showStage(num,6);
            being = -1;
            while(m < face._user.warehouse.length)
            {
               if(land.crop == face._user.warehouse[m].fruit)
               {
                  being = m;
                  break;
               }
               m++;
            }
            if(being > -1)
            {
               face._user.warehouse[being].number = int(face._user.warehouse[being].number) + land.yield;
            }
            else
            {
               face._user.warehouse.push({
                  "fruit":land.crop,
                  "number":land.yield,
                  "name":String(face.cropXml.items.(@seed == land.crop).@name),
                  "price":int(face.cropXml.items.(@seed == land.crop).@price)
               });
            }
            face.showWarehouse();
            land.progress = undefined;
            land.harvest = "xx";
            delete land.grass;
            delete land.worm;
            face.showPests(num);
            face._user.experience = int(face._user.experience) + int(face.cropXml.items.(@seed == land.crop).@experience);
            face.changeExp();
            tip("收获" + land.yield + "个");
            face.so.data.user = face._user;
            face.so.flush();
         }
         else if(tool.indexOf("Seed") > 0)
         {
            if(land.crop != undefined)
            {
               tip("不可以种在这里哦!");
               return;
            }
            clip = face.getChild(face.cropXml.items.(@seed == tool).@crop);
            clip.name = "xxxxxxxxx" + num;
            face.farmlandContainer.addChild(clip);
            clip.x = face._farmland_array[num].x;
            clip.y = face._farmland_array[num].y;
            land.crop = tool;
            land.time = int(new Date().time / 1000);
            face.grow(num);
            face.showStage(num,0);
            consume();
         }
         else if(FERTILIZER[tool] != undefined)
         {
            if(land.crop == undefined || land.harvest != undefined || face.grow(num) == 5)
            {
               tip("这块地不用施肥!");
               return;
            }
            land.time = int(land.time) - FERTILIZER[tool];
            face.showStage(num,face.grow(num));
            tip("施肥成功");
            consume();
         }
      }
      
      private function tip(param1:String) : void
      {
         myCard.showCard(param1);
         myCard.x = face._bg.x + face._farmland_array[num].x + (face._farmland_array[num].width - myCard.width) / 2;
         myCard.y = face._bg.y + face._farmland_array[num].y + face._farmland_array[num].height / 2 - myCard.height;
         face._stage.setChildIndex(myCard,face._stage.numChildren - 1);
         face._stage.setChildIndex(face._myMouse,face._stage.numChildren - 1);
      }
      
      private function reward(param1:String) : void
      {
         face._user.experience = int(face._user.experience) + CARE_EXP;
         face.changeExp();
         tip(param1 + "，经验+" + CARE_EXP);
         face.so.data.user = face._user;
         face.so.flush();
      }
      
      private function dig() : void
      {
         var land:Object = face._user.farmland[num];
         face.farmlandContainer.removeChild(face.farmlandContainer.getChildByName("xxxxxxxxx" + num));
         delete land.crop;
         delete land.state;
         delete land.time;
         delete land.growth;
         delete land.harvest;
         delete land.progress;
         delete land.yield;
         delete land.grass;
         delete land.worm;
         face.showPests(num);
         face.so.data.user = face._user;
         face.so.flush();
      }
      
      private function consume() : void
      {
         var i:uint = 0;
         while(i < face._user.burden.length)
         {
            if(face._user.burden[i].Items == face._myMouse.name)
            {
               face._user.burden[i].number = int(face._user.burden[i].number) - 1;
               if(face._user.burden[i].number == 0)
               {
                  face._user.burden.splice(i,1);
                  face.changeMouse("CursorArrow");
               }
               break;
            }
            i++;
         }
         face.showBurden();
         face.so.data.user = face._user;
         face.so.flush();
      }
      
      private function rollOverHandler(param1:MouseEvent) : void
      {
         var _loc2_:uint = 0;
         _loc2_ = uint(int(String(param1.target.name).slice(9,String(param1.target.name).length)));
         if(face._user.farmland[_loc2_].harvest == undefined)
         {
            progress = face.getChild("FarmInfo");
            progress.mouseEnabled = false;
            progress.mouseChildren = false;
            face._stage.addChild(progress);
            progress.growText.text = face._user.farmland[_loc2_].growth;
            progress.growBar.width = 122 * Number(face._user.farmland[_loc2_].progress);
            progress.x = face._stage.mouseX;
            progress.y = face._stage.mouseY;
            param1.target.addEventListener(MouseEvent.ROLL_OUT,cropMouseOut);
         }
      }
      
      private function addListener() : void
      {
         var _loc1_:uint = 0;
         var _loc2_:DisplayObject = null;
         while(_loc1_ < face.farmlandContainer.numChildren)
         {
            _loc2_ = face.farmlandContainer.getChildAt(_loc1_);
            if(_loc2_.name.indexOf("xxxxxxxxx") > -1)
            {
               _loc2_.addEventListener(MouseEvent.ROLL_OVER,rollOverHandler);
            }
            _loc1_++;
         }
      }
      
      private function tipsDefineHandler(param1:MouseEvent) : void
      {
         tipsCloseHandler();
         dig();
      }
      
      private function farmlandOverHandler(param1:MouseEvent) : void
      {
         var _loc2_:String = null;
         var _loc3_:MovieClip = null;
         _loc2_ = String(param1.target.name).slice(0,9);
         if(_loc2_ == "FarmlandS" || _loc2_ == "FarmlandG")
         {
            _loc3_ = face.farmlandContainer.getChildByName(param1.target.name) as MovieClip;
            if(_loc3_ != null)
            {
               _loc3_.gotoAndStop(2);
               _loc3_.addEventListener(MouseEvent.MOUSE_OUT,farmlandOutHandler);
            }
         }
         if(count == 0)
         {
            addListener();
         }
      }
   }
}

