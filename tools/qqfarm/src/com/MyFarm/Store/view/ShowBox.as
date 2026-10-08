package com.MyFarm.Store.view
{
   import com._public._filter.transitions.Tweener;
   import flash.display.DisplayObject;
   import flash.display.Loader;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.events.TextEvent;
   import flash.net.URLRequest;
   
   public class ShowBox extends Sprite
   {
      
      private var str:String;
      
      private var bg:Sprite;
      
      private var price:Number;
      
      private var _height:Number;
      
      private var mc:MovieClip;
      
      private var fun:Function;
      
      private var displayObject:DisplayObject;
      
      private var info:Object;
      
      private var img:DisplayObject;
      
      private var _width:Number;
      
      private var _x:Number;
      
      private var _y:Number;
      
      public function ShowBox(param1:MovieClip, param2:String, param3:String, param4:DisplayObject, param5:Object, param6:Function)
      {
         super();
         mc = param1;
         _width = mc.width;
         _height = mc.height;
         str = param2;
         fun = param6;
         info = param5;
         if(param2 == "tab1")
         {
            mc.stepper.value = 1;
            addListen();
            init(param5.price,param5.name,param5.information,param5.type,param5.maturation,param5.experience,param5.rank,param5.yield,param5.prices,param5.revenue);
         }
         else if(param2 == "tab2")
         {
            mc.stepper.value = 1;
            addListen();
            init2(param5.name,param5.price,param5.type,param5.info);
         }
         else if(param2 == "tab3")
         {
            addListen2();
            init3(param5.name,param5.price,param5.type,param5.info);
         }
         if(param3 != "")
         {
            begin(param3);
         }
         else if(param4 != null)
         {
            displayObject = param4;
         }
      }
      
      private function beginComplete() : void
      {
         if(img != null)
         {
            img.x = 19;
            img.y = 40;
            img.width = 80;
            img.height = 80;
            mc.addChild(img);
         }
         else if(displayObject != null)
         {
            displayObject.scaleX = 1.5;
            displayObject.scaleY = 1.5;
            displayObject.x = 19 + (80 - displayObject.width) / 2;
            displayObject.y = 40 + (80 - displayObject.height) / 2;
            mc.addChild(displayObject);
         }
         bg = createShape(2000,2000,0,0);
         mc.parent.addChildAt(bg,mc.parent.numChildren - 1);
      }
      
      public function release() : void
      {
         img = null;
         bg = null;
         mc.define.removeEventListener(MouseEvent.CLICK,defineClick);
         mc.cancel.removeEventListener(MouseEvent.CLICK,closeClick);
         mc.close_btn.removeEventListener(MouseEvent.CLICK,closeClick);
         if(str != "tab3")
         {
            mc.info.text = "";
            mc.stepper.textField.removeEventListener(TextEvent.TEXT_INPUT,textInputHandler);
            mc.stepper.removeEventListener(Event.CHANGE,stepperChange);
         }
         mc = null;
         displayObject = null;
      }
      
      private function init(param1:String, param2:String, param3:String, param4:String, param5:String, param6:String, param7:String, param8:String, param9:String, param10:String) : void
      {
         mc.stepper.textField.maxChars = 2;
         mc.type_txt.mouseEnabled = false;
         mc.type_txt.text = param4;
         mc.maturation_txt.mouseEnabled = false;
         mc.maturation_txt.text = param5 + " 小时";
         mc.experience_txt.mouseEnabled = false;
         mc.experience_txt.text = param6 + " / 季";
         mc.rank_txt.mouseEnabled = false;
         mc.rank_txt.text = param7 + " 级";
         mc.price_txt.mouseEnabled = false;
         mc.price_txt.text = param1 + " 元宝";
         price = Number(param1);
         mc.title_txt.mouseEnabled = false;
         mc.title_txt.text = param2;
         mc.yield_txt.text = param8 + "个";
         mc.yield_txt.mouseEnabled = false;
         mc.prices_txt.text = param9 + "元宝";
         mc.prices_txt.mouseEnabled = false;
         mc.revenue_txt.text = param10 + "元宝";
         mc.revenue_txt.mouseEnabled = false;
      }
      
      private function enterFrameHandler(param1:Event) : void
      {
         if(mc.stepper.textField.text.length < 1)
         {
            mc.stepper.textField.text = "1";
            mc.price_txt.text = price + " 元宝";
            mc.removeEventListener(Event.ENTER_FRAME,enterFrameHandler);
         }
         else
         {
            mc.price_txt.text = price * int(mc.stepper.textField.text) + " 元宝";
            mc.removeEventListener(Event.ENTER_FRAME,enterFrameHandler);
         }
      }
      
      private function init2(param1:String, param2:String, param3:String, param4:String) : void
      {
         mc.stepper.textField.maxChars = 2;
         mc.title_txt.text = param1;
         mc.title_txt.mouseEnabled = false;
         mc.price_txt.text = param2 + "元宝";
         mc.price_txt.mouseEnabled = false;
         mc.type_txt.text = param3;
         mc.type_txt.mouseEnabled = false;
         mc.info_txt.text = param4;
         mc.info_txt.mouseEnabled = false;
         price = Number(param2);
      }
      
      private function init3(param1:String, param2:String, param3:String, param4:String) : void
      {
         mc.title_txt.text = param1;
         mc.title_txt.mouseEnabled = false;
         mc.price_txt.text = param2 + "元宝";
         mc.price_txt.mouseEnabled = false;
         mc.type_txt.text = param3;
         mc.type_txt.mouseEnabled = false;
         mc.info_txt.text = param4;
         mc.info_txt.mouseEnabled = false;
         price = Number(param2);
      }
      
      private function createShape(param1:Number, param2:Number, param3:uint, param4:Number) : Sprite
      {
         var _loc5_:Sprite = null;
         _loc5_ = new Sprite();
         _loc5_.graphics.beginFill(param3,param4);
         _loc5_.graphics.drawRect(0,0,param1,param2);
         _loc5_.graphics.endFill();
         return _loc5_;
      }
      
      private function endComplete() : void
      {
         if(img != null)
         {
            mc.removeChild(img);
         }
         else if(displayObject != null)
         {
            mc.removeChild(displayObject);
         }
         mc.height *= 10;
         mc.width *= 10;
         mc.parent.removeChild(bg);
         mc.parent.removeChild(mc);
         release();
      }
      
      private function addListen2() : void
      {
         mc.define.addEventListener(MouseEvent.CLICK,defineClick);
         mc.cancel.addEventListener(MouseEvent.CLICK,closeClick);
         mc.close_btn.addEventListener(MouseEvent.CLICK,closeClick);
      }
      
      private function closeClick(param1:MouseEvent = null) : void
      {
         Tweener.addTween(mc,{
            "width":mc.width / 10,
            "height":mc.height / 10,
            "alpha":0,
            "time":1,
            "x":_x + (mc.width - mc.width / 10) / 2,
            "y":_y + (mc.height - mc.height / 10) / 2,
            "onComplete":endComplete
         });
      }
      
      private function loaderComplete(param1:Event) : void
      {
         img = DisplayObject(param1.target.content);
      }
      
      public function beginShow() : void
      {
         _x = mc.x;
         _y = mc.y;
         mc.width /= 10;
         mc.height /= 10;
         mc.x += (_width - mc.width) / 2;
         mc.y += (_height - mc.height) / 2;
         mc.alpha = 0;
         Tweener.addTween(mc,{
            "width":_width,
            "height":_height,
            "alpha":1,
            "time":1,
            "x":_x,
            "y":_y,
            "onComplete":beginComplete
         });
      }
      
      private function begin(param1:String) : void
      {
         var _loc2_:Loader = null;
         _loc2_ = new Loader();
         _loc2_.load(new URLRequest(param1));
         _loc2_.contentLoaderInfo.addEventListener(Event.COMPLETE,loaderComplete);
      }
      
      private function defineClick(param1:MouseEvent) : void
      {
         var _loc2_:uint = 0;
         if(str != "tab3")
         {
            _loc2_ = uint(int(mc.price_txt.text.slice(0,mc.price_txt.text.indexOf("元"))));
            fun(int(info.id),_loc2_);
         }
      }
      
      private function addListen() : void
      {
         mc.define.addEventListener(MouseEvent.CLICK,defineClick);
         mc.cancel.addEventListener(MouseEvent.CLICK,closeClick);
         mc.close_btn.addEventListener(MouseEvent.CLICK,closeClick);
         mc.stepper.textField.addEventListener(TextEvent.TEXT_INPUT,textInputHandler);
         mc.stepper.addEventListener(Event.CHANGE,stepperChange);
      }
      
      private function stepperChange(param1:Event) : void
      {
         mc.price_txt.text = price * int(mc.stepper.textField.text) + " 元宝";
      }
      
      private function textInputHandler(param1:TextEvent) : void
      {
         mc.addEventListener(Event.ENTER_FRAME,enterFrameHandler);
      }
      
      public function close() : void
      {
         closeClick();
      }
   }
}

