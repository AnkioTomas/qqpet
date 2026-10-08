package com.MyFarm.control
{
   import com.MyFarm.view.InstallFace;
   import com._public._displayObject.Card;
   import flash.display.DisplayObject;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.MouseEvent;
   import flash.external.ExternalInterface;
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
      
      /** The plot the last press landed on, -1 for anywhere else. */
      private var pressed:int = -1;
      
      private var myCard:Card = new Card();
      
      private var face:InstallFace = InstallFace.getInstance();
      
      private var progress:MovieClip;
      
      private var tips:MovieClip;
      
      public function FarmlandControl()
      {
         super();
         face.farmlandContainer.addEventListener(MouseEvent.MOUSE_OVER,farmlandOverHandler);
         // Flash only clicks when press and release hit the same clip, and a crop is many nested clips:
         // a press and release on the same plot is the click.
         face._stage.addEventListener(MouseEvent.MOUSE_DOWN,pressHandler);
         face.farmlandContainer.addEventListener(MouseEvent.MOUSE_UP,farmlandClickHandler);
         // The card sits over the plot just clicked; it must not take the next click.
         myCard.mouseEnabled = false;
         myCard.mouseChildren = false;
         face._stage.addChild(myCard);
         if(ExternalInterface.available)
         {
            ExternalInterface.addCallback("farmAll",farmAll);
         }
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
      
      private function hideProgress() : void
      {
         if(progress != null && progress.parent != null)
         {
            progress.parent.removeChild(progress);
         }
         progress = null;
      }
      
      private function cropMouseOut(param1:MouseEvent) : void
      {
         hideProgress();
         param1.currentTarget.removeEventListener(MouseEvent.ROLL_OUT,cropMouseOut);
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
      
      /** The plot under a click, from whichever of its nested clips was hit; -1 for wasteland, the sign or the background. */
      private function plotOf(param1:DisplayObject) : int
      {
         var hit:DisplayObject = param1;
         var m:Array = null;
         while(hit != null && hit.parent != face.farmlandContainer)
         {
            hit = hit.parent;
         }
         if(hit == null)
         {
            return -1;
         }
         m = hit.name.match(/^(FarmlandS|FarmlandG|xxxxxxxxx)(\d+)$/);
         return m == null ? -1 : int(m[2]);
      }
      
      private function pressHandler(param1:MouseEvent) : void
      {
         pressed = plotOf(param1.target as DisplayObject);
      }
      
      private function farmlandClickHandler(param1:MouseEvent) : void
      {
         var i:int = plotOf(param1.target as DisplayObject);
         var land:Object = null;
         var tool:String = face._myMouse.name;
         var msg:String = null;
         if(i < 0 || i != pressed)
         {
            return;
         }
         pressed = -1;
         num = i;
         land = face._user.farmland[i];
         if(tool == "CursorHoe")
         {
            hoe(i);
            return;
         }
         if(tool == "CursorWater")
         {
            msg = water(i) || "这块地不用浇水!";
         }
         else if(tool == "CursorHook")
         {
            msg = weed(i) || "这块地不用除草!";
         }
         else if(tool == "CursorPesticide")
         {
            msg = kill(i) || "这块地不用杀虫!";
         }
         else if(tool == "CursorHand")
         {
            msg = harvest(i) || "这块地没有东西可收获!";
         }
         else if(tool == "CursorArrow")
         {
            msg = harvest(i) || care(i) || clear(i) || idle(i);
         }
         else if(tool.indexOf("Seed") > 0)
         {
            clear(i);
            msg = plant(i,tool) || "不可以种在这里哦!";
         }
         else if(FERTILIZER[tool] != undefined)
         {
            msg = fertilize(i,tool) || "这块地不用施肥!";
         }
         if(msg != null)
         {
            tip(msg);
         }
         save();
      }
      
      /** What the arrow says about a plot it has nothing to do for. */
      private function idle(param1:uint) : String
      {
         var land:Object = face._user.farmland[param1];
         if(land.crop == undefined)
         {
            return "从包袱里选种子,再点空地播种";
         }
         return land.growth;
      }
      
      private function hoe(param1:uint) : void
      {
         var land:Object = face._user.farmland[param1];
         if(land.crop == undefined)
         {
            tip("不允许对空地进行操作!");
            return;
         }
         if(land.harvest != undefined)
         {
            dig(param1);
            save();
            return;
         }
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
      
      private function water(param1:uint) : String
      {
         if(face._user.farmland[param1].farmland != "FarmlandG")
         {
            return null;
         }
         face.farmlandChange(param1,"FarmlandS");
         return reward("浇水成功");
      }
      
      private function weed(param1:uint) : String
      {
         var land:Object = face._user.farmland[param1];
         if(land.grass == undefined)
         {
            return null;
         }
         delete land.grass;
         face.showPests(param1);
         return reward("除草成功");
      }
      
      private function kill(param1:uint) : String
      {
         var land:Object = face._user.farmland[param1];
         if(land.worm == undefined)
         {
            return null;
         }
         delete land.worm;
         face.showPests(param1);
         return reward("杀虫成功");
      }
      
      /** Water, weed and kill insects at once; null when the plot needs none of them. */
      private function care(param1:uint) : String
      {
         var done:Array = [];
         for each(var s:String in [water(param1),weed(param1),kill(param1)])
         {
            if(s != null)
            {
               done.push(s);
            }
         }
         return done.length == 0 ? null : done.join("\n");
      }
      
      private function harvest(param1:uint) : String
      {
         var land:Object = face._user.farmland[param1];
         var being:int = -1;
         var m:uint = 0;
         if(land.crop == undefined || land.harvest != undefined || face.grow(param1) != 5)
         {
            return null;
         }
         face.showStage(param1,6);
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
         face.showPests(param1);
         face._user.experience = int(face._user.experience) + int(face.cropXml.items.(@seed == land.crop).@experience);
         face.changeExp();
         return "收获" + land.yield + "个";
      }
      
      /** Digs up a crop already harvested; null when there is none. */
      private function clear(param1:uint) : String
      {
         if(face._user.farmland[param1].harvest == undefined)
         {
            return null;
         }
         dig(param1);
         return "铲除枯萎作物";
      }
      
      private function plant(param1:uint, param2:String) : String
      {
         var land:Object = face._user.farmland[param1];
         var clip:Sprite = null;
         if(land.crop != undefined || land.farmland == "Wasteland")
         {
            return null;
         }
         clip = face.getChild(face.cropXml.items.(@seed == param2).@crop);
         clip.name = "xxxxxxxxx" + param1;
         face.farmlandContainer.addChild(clip);
         clip.x = face._farmland_array[param1].x;
         clip.y = face._farmland_array[param1].y;
         land.crop = param2;
         land.time = int(new Date().time / 1000);
         face.grow(param1);
         face.showStage(param1,0);
         consume(param2);
         return "播种成功";
      }
      
      private function fertilize(param1:uint, param2:String) : String
      {
         var land:Object = face._user.farmland[param1];
         if(land.crop == undefined || land.harvest != undefined || face.grow(param1) == 5)
         {
            return null;
         }
         land.time = int(land.time) - FERTILIZER[param2];
         face.showStage(param1,face.grow(param1));
         consume(param2);
         return "施肥成功";
      }
      
      /** The seed plant-all sows next: the one in hand, else the first in the bag; null when out of seeds. */
      private function nextSeed() : String
      {
         var tool:String = face._myMouse.name;
         var i:uint = 0;
         var first:String = null;
         while(i < face._user.burden.length)
         {
            if(face._user.burden[i].Items == tool)
            {
               return tool;
            }
            if(first == null && String(face._user.burden[i].Items).indexOf("Seed") > 0)
            {
               first = face._user.burden[i].Items;
            }
            i++;
         }
         return first;
      }
      
      /** One-click actions for the page around the movie: "harvest", "care", "clear" or "plant", on every plot. */
      private function farmAll(param1:String) : String
      {
         var i:uint = 0;
         var done:uint = 0;
         var fruits:uint = 0;
         var item:String = param1 == "plant" ? nextSeed() : null;
         var msg:String = null;
         if(param1 == "plant" && item == null)
         {
            centerTip("包袱里没有种子,先去商店买吧!");
            return "";
         }
         while(i < face._user.farmland.length)
         {
            if(param1 == "harvest" && harvest(i) != null)
            {
               done++;
               fruits += uint(face._user.farmland[i].yield);
            }
            else if(param1 == "care" && care(i) != null)
            {
               done++;
            }
            else if(param1 == "clear" && clear(i) != null)
            {
               done++;
            }
            else if(param1 == "plant" && item != null && plant(i,item) != null)
            {
               done++;
               item = nextSeed();
            }
            i++;
         }
         if(param1 == "harvest")
         {
            msg = done == 0 ? "没有成熟的作物" : "收获" + done + "块地,共" + fruits + "个果实";
         }
         else if(param1 == "care")
         {
            msg = done == 0 ? "所有作物都很健康" : "照料了" + done + "块地,经验增加";
         }
         else if(param1 == "clear")
         {
            msg = done == 0 ? "没有枯萎的作物" : "铲除了" + done + "块地的枯萎作物";
         }
         else
         {
            msg = done == 0 ? "没有空地可以播种" : "播种了" + done + "块地";
         }
         centerTip(msg);
         save();
         return msg;
      }
      
      private function tip(param1:String) : void
      {
         myCard.showCard(param1);
         myCard.x = face._bg.x + face._farmland_array[num].x + (face._farmland_array[num].width - myCard.width) / 2;
         myCard.y = face._bg.y + face._farmland_array[num].y + face._farmland_array[num].height / 2 - myCard.height;
         face._stage.setChildIndex(myCard,face._stage.numChildren - 1);
         face._stage.setChildIndex(face._myMouse,face._stage.numChildren - 1);
      }
      
      private function centerTip(param1:String) : void
      {
         myCard.showCard(param1);
         myCard.x = (face._stage.stageWidth - myCard.width) / 2;
         myCard.y = (face._stage.stageHeight - myCard.height) / 2;
         face._stage.setChildIndex(myCard,face._stage.numChildren - 1);
         face._stage.setChildIndex(face._myMouse,face._stage.numChildren - 1);
      }
      
      private function reward(param1:String) : String
      {
         face._user.experience = int(face._user.experience) + CARE_EXP;
         face.changeExp();
         return param1 + "，经验+" + CARE_EXP;
      }
      
      private function save() : void
      {
         face.so.data.user = face._user;
         face.so.flush();
      }
      
      private function dig(param1:uint) : void
      {
         var land:Object = face._user.farmland[param1];
         // The crop clip goes away under the pointer, so its ROLL_OUT never comes.
         hideProgress();
         face.farmlandContainer.removeChild(face.farmlandContainer.getChildByName("xxxxxxxxx" + param1));
         delete land.crop;
         delete land.state;
         delete land.time;
         delete land.growth;
         delete land.harvest;
         delete land.progress;
         delete land.yield;
         delete land.grass;
         delete land.worm;
         face.showPests(param1);
      }
      
      /** Takes one [param1] out of the bag; the hand goes back to the arrow once the last is used. */
      private function consume(param1:String) : void
      {
         var i:uint = 0;
         while(i < face._user.burden.length)
         {
            if(face._user.burden[i].Items == param1)
            {
               face._user.burden[i].number = int(face._user.burden[i].number) - 1;
               if(face._user.burden[i].number == 0)
               {
                  face._user.burden.splice(i,1);
                  if(face._myMouse.name == param1)
                  {
                     face.changeMouse("CursorArrow");
                  }
               }
               break;
            }
            i++;
         }
         face.showBurden();
      }
      
      private function rollOverHandler(param1:MouseEvent) : void
      {
         var i:int = plotOf(param1.currentTarget as DisplayObject);
         if(i < 0 || face._user.farmland[i].harvest != undefined)
         {
            return;
         }
         hideProgress();
         progress = face.getChild("FarmInfo");
         progress.mouseEnabled = false;
         progress.mouseChildren = false;
         face._stage.addChild(progress);
         progress.growText.text = face._user.farmland[i].growth;
         progress.growBar.width = 122 * Number(face._user.farmland[i].progress);
         progress.x = face._stage.mouseX;
         progress.y = face._stage.mouseY;
         param1.currentTarget.addEventListener(MouseEvent.ROLL_OUT,cropMouseOut);
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
         dig(num);
         save();
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
         // Crops sown since the last pass need their hover listener too.
         addListener();
      }
   }
}
