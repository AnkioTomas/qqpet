package com.MyFarm.control
{
   import com.MyFarm.Store.MyStore;
   import com.MyFarm.view.InstallFace;
   import com._public._filter.transitions.Tweener;
   import com._public._method.ClearMemory;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.events.TextEvent;
   import flash.ui.Mouse;
   
   public class TitleControl
   {
      
      private var tipBox2:MovieClip;
      
      private var bg:Sprite;
      
      private var num:int;
      
      private var showBox:MovieClip;
      
      private var myStore:MyStore;
      
      private var face:InstallFace = InstallFace.getInstance();
      
      private var tipBox:MovieClip;
      
      private var photo:Sprite;
      
      public function TitleControl()
      {
         super();
         bg = createShape(face._stage.stageWidth,face._stage.stageHeight);
         face._title.addEventListener(MouseEvent.CLICK,titleClickHandler);
         face._title.addEventListener(MouseEvent.MOUSE_OVER,titleOverHandler);
      }
      
      private function closeClickHandler(param1:MouseEvent) : void
      {
         Mouse.hide();
         face._myMouse.visible = true;
         face._stage.removeChild(bg);
         face._shop.visible = false;
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
      
      private function showWarehouse() : void
      {
         var _loc1_:Number = Number(NaN);
         var _loc2_:Number = Number(NaN);
         var _loc3_:Number = Number(NaN);
         var _loc4_:Number = Number(NaN);
         Mouse.show();
         face._myMouse.visible = false;
         face._stage.addChild(bg);
         face._stage.setChildIndex(face._warehouse,face._stage.numChildren - 1);
         face._warehouse.visible = true;
         face._warehouse.alpha = 0.2;
         _loc1_ = face._warehouse.x;
         _loc2_ = face._warehouse.y;
         _loc3_ = 1;
         _loc4_ = 1;
         face._warehouse.scaleX = 0.2;
         face._warehouse.scaleY = 0.2;
         face._warehouse.x = (face._stage.stageWidth - face._warehouse.width) / 2;
         face._warehouse.y = (face._stage.stageHeight - face._warehouse.height) / 2;
         Tweener.addTween(face._warehouse,{
            "alpha":1,
            "x":_loc1_,
            "y":_loc2_,
            "scaleX":_loc3_,
            "scaleY":_loc4_,
            "time":0.5,
            "onComplete":warehousetweenComplete
         });
         face._warehouse.addEventListener(MouseEvent.CLICK,warehouseClickHandler);
         if(face._user.warehouse.length > 0)
         {
            face._warehouse.ask_btn.visible = true;
            face._warehouse.ask_btn.addEventListener(MouseEvent.CLICK,soldAllHandler);
         }
         else
         {
            face._warehouse.ask_btn.visible = false;
         }
      }
      
      private function showBoxClose(param1:MouseEvent = null) : void
      {
         showBox.stepper.removeEventListener(Event.CHANGE,stepperChange);
         showBox.cancel.removeEventListener(MouseEvent.CLICK,showBoxClose);
         showBox.close_btn.removeEventListener(MouseEvent.CLICK,showBoxClose);
         showBox.stepper.textField.removeEventListener(TextEvent.TEXT_INPUT,stepperInputHandler);
         face._stage.removeChild(showBox);
         photo = null;
         showBox = null;
         face.so.data.user = face._user;
         face.so.flush();
      }
      
      private function showShop() : void
      {
         var _loc1_:Number = Number(NaN);
         var _loc2_:Number = Number(NaN);
         var _loc3_:Number = Number(NaN);
         var _loc4_:Number = Number(NaN);
         Mouse.show();
         face._myMouse.visible = false;
         face._stage.addChild(bg);
         face._stage.setChildIndex(face._shop,face._stage.numChildren - 1);
         face._shop.visible = true;
         face._shop.alpha = 0.2;
         _loc1_ = face._shop.x;
         _loc2_ = face._shop.y;
         _loc3_ = 1;
         _loc4_ = 1;
         face._shop.scaleX = 0.2;
         face._shop.scaleY = 0.2;
         face._shop.x = (face._stage.stageWidth - face._shop.width) / 2;
         face._shop.y = (face._stage.stageHeight - face._shop.height) / 2;
         Tweener.addTween(face._shop,{
            "alpha":1,
            "x":_loc1_,
            "y":_loc2_,
            "scaleX":_loc3_,
            "scaleY":_loc4_,
            "time":0.5,
            "onComplete":shoptweenComplete
         });
      }
      
      private function titleOutHandler(param1:MouseEvent) : void
      {
         Mouse.hide();
         face._myMouse.visible = true;
         face._title.removeEventListener(MouseEvent.MOUSE_OUT,titleOutHandler);
      }
      
      private function soldHandler(param1:MouseEvent) : void
      {
         var _loc2_:int = 0;
         var _loc3_:int = 0;
         var _loc4_:String = null;
         _loc2_ = int(showBox.total_txt.text.slice(0,showBox.total_txt.text.indexOf("元")));
         face._user.wealth = String(int(face._user.wealth) + _loc2_);
         _loc3_ = int(int(showBox.total_txt.text.slice(0,showBox.total_txt.text.indexOf("元"))) / int(showBox.price_txt.text.slice(0,showBox.price_txt.text.indexOf("元"))));
         face._user.warehouse[num].number = int(face._user.warehouse[num].number) - _loc3_;
         _loc4_ = face._user.warehouse[num].name;
         if(face._user.warehouse[num].number < 1)
         {
            face._user.warehouse.splice(num,1);
         }
         face.showWarehouse();
         face.changeExp();
         showBoxClose();
         tipBox = face.getChild("Tips");
         face._stage.addChild(tipBox);
         tipBox.x = face._warehouse.x + (face._warehouse.width - tipBox.width) / 2;
         tipBox.y = face._warehouse.y + (face._warehouse.height - tipBox.height) / 2;
         tipBox.num_txt.text = _loc3_;
         tipBox.num_txt.mouseEnabled = false;
         tipBox.name_txt.text = _loc4_;
         tipBox.name_txt.mouseEnabled = false;
         tipBox.price_txt.text = _loc2_;
         tipBox.price_txt.mouseEnabled = false;
         tipBox.close_btn.addEventListener(MouseEvent.CLICK,tipsCloseHandler);
         tipBox.define.addEventListener(MouseEvent.CLICK,tipsCloseHandler);
         if(face._user.warehouse.length < 1)
         {
            face._warehouse.ask_btn.visible = false;
         }
      }
      
      private function stepperInputHandler(param1:TextEvent) : void
      {
         face._stage.addEventListener(Event.ENTER_FRAME,stepperEnterFrame);
      }
      
      private function tipsCloseHandler(param1:MouseEvent) : void
      {
         tipBox.close_btn.removeEventListener(MouseEvent.CLICK,tipsCloseHandler);
         tipBox.define.removeEventListener(MouseEvent.CLICK,tipsCloseHandler);
         face._stage.removeChild(tipBox);
         tipBox = null;
         face.so.data.user = face._user;
         face.so.flush();
      }
      
      private function titleClickHandler(param1:MouseEvent) : void
      {
         if(param1.target.name == "ButtonDecorate")
         {
            showDecorate();
            face._title.removeEventListener(MouseEvent.MOUSE_OUT,titleOutHandler);
         }
         else if(param1.target.name == "ButtonShop")
         {
            showShop();
            face._title.removeEventListener(MouseEvent.MOUSE_OUT,titleOutHandler);
         }
         else if(param1.target.name == "ButtonWarehouse")
         {
            showWarehouse();
            face._title.removeEventListener(MouseEvent.MOUSE_OUT,titleOutHandler);
         }
         else if(param1.target.name == "ButtonFarm")
         {
         }
      }
      
      private function tips2CloseHandler(param1:MouseEvent = null) : void
      {
         tipBox2.close_btn.removeEventListener(MouseEvent.CLICK,tips2CloseHandler);
         tipBox2.cancel.removeEventListener(MouseEvent.CLICK,tips2CloseHandler);
         tipBox2.define.removeEventListener(MouseEvent.CLICK,tipClickHandler);
         face._stage.removeChild(tipBox2);
         tipBox2 = null;
         face.so.data.user = face._user;
         face.so.flush();
      }
      
      private function titleOverHandler(param1:MouseEvent) : void
      {
         Mouse.show();
         face._myMouse.visible = false;
         face._title.addEventListener(MouseEvent.MOUSE_OUT,titleOutHandler);
      }
      
      private function warehousetweenComplete() : void
      {
         face._warehouse.close_btn.addEventListener(MouseEvent.CLICK,warehouseCloseHandler);
      }
      
      private function shoptweenComplete() : void
      {
         var _loc1_:Array = null;
         var _loc2_:MovieClip = null;
         var _loc3_:MovieClip = null;
         var _loc4_:MovieClip = null;
         if(myStore == null)
         {
            _loc1_ = new Array();
            _loc2_ = face.getChild("shopbox");
            _loc1_.push(_loc2_);
            _loc3_ = face.getChild("shopbox2");
            _loc1_.push(_loc3_);
            _loc4_ = face.getChild("shopbox3");
            _loc1_.push(_loc4_);
            myStore = new MyStore(face._shop,face._stage,_loc1_);
            myStore.currentRank = int(face._user.rank);
         }
         face._shop.close_btn.addEventListener(MouseEvent.CLICK,closeClickHandler);
      }
      
      private function warehouseClickHandler(param1:MouseEvent) : void
      {
         if(String(param1.target.name).indexOf("bg") > -1)
         {
            num = int(String(param1.target.name).slice(2));
            showBox = face.getChild("box");
            face._stage.addChild(showBox);
            showBox.x = face._warehouse.x + (face._warehouse.width - showBox.width) / 2;
            showBox.y = face._warehouse.y + (face._warehouse.height - showBox.height) / 2;
            showBox.price_txt.text = face._user.warehouse[num].price + "元宝";
            showBox.stepper.value = face._user.warehouse[num].number;
            showBox.stepper.textField.restrict = "0-9";
            showBox.stepper.textField.maxChars = 3;
            showBox.txt.text = "输入卖出数量(1-" + face._user.warehouse[num].number + ")";
            showBox.stepper.maximum = face._user.warehouse[num].number;
            showBox.total_txt.text = int(face._user.warehouse[num].number) * int(face._user.warehouse[num].price) + "元宝";
            showBox.title_txt.text = face._user.warehouse[num].name;
            photo = face.getChild(face._user.warehouse[num].fruit);
            showBox.addChild(photo);
            photo.x = 18 + (80 - photo.width) / 2;
            photo.y = 40 + (80 - photo.height) / 2;
            showBox.close_btn.addEventListener(MouseEvent.CLICK,showBoxClose);
            showBox.cancel.addEventListener(MouseEvent.CLICK,showBoxClose);
            showBox.stepper.addEventListener(Event.CHANGE,stepperChange);
            showBox.stepper.textField.addEventListener(TextEvent.TEXT_INPUT,stepperInputHandler);
            showBox.define.addEventListener(MouseEvent.CLICK,soldHandler);
         }
      }
      
      private function stepperChange(param1:Event) : void
      {
         showBox.total_txt.text = int(showBox.stepper.value) * int(showBox.price_txt.text.slice(0,showBox.price_txt.text.indexOf("元"))) + "元宝";
      }
      
      private function soldAllHandler(param1:MouseEvent) : void
      {
         tipBox2 = face.getChild("Tips2");
         face._stage.addChild(tipBox2);
         tipBox2.x = face._warehouse.x + (face._warehouse.width - tipBox2.width) / 2;
         tipBox2.y = face._warehouse.y + (face._warehouse.height - tipBox2.height) / 2;
         tipBox2.txt.text = "是否出售所有物品,总价值为:" + face._warehouse.worth_txt.text;
         tipBox2.txt.mouseEnabled = false;
         tipBox2.close_btn.addEventListener(MouseEvent.CLICK,tips2CloseHandler);
         tipBox2.cancel.addEventListener(MouseEvent.CLICK,tips2CloseHandler);
         tipBox2.define.addEventListener(MouseEvent.CLICK,tipClickHandler);
      }
      
      private function warehouseCloseHandler(param1:MouseEvent) : void
      {
         var _loc2_:ClearMemory = null;
         Mouse.hide();
         face._myMouse.visible = true;
         face._warehouse.removeEventListener(MouseEvent.CLICK,warehouseClickHandler);
         face._stage.removeChild(bg);
         face._warehouse.visible = false;
         _loc2_ = ClearMemory.getInstance();
         _loc2_.runClear();
         face.so.data.user = face._user;
         face.so.flush();
      }
      
      private function showDecorate() : void
      {
      }
      
      private function tipClickHandler(param1:MouseEvent) : void
      {
         var _loc2_:int = 0;
         _loc2_ = int(face._warehouse.worth_txt.text);
         face._user.wealth = String(int(face._user.wealth) + _loc2_);
         face._user.warehouse = new Array();
         face.showWarehouse();
         face.changeExp();
         face._warehouse.ask_btn.visible = false;
         tips2CloseHandler();
      }
      
      private function shopClickHandler(param1:MouseEvent) : void
      {
         trace(param1.target.name);
      }
      
      private function stepperEnterFrame(param1:Event) : void
      {
         if(showBox.stepper.textField.text == "")
         {
            showBox.stepper.value = 1;
            showBox.total_txt.text = int(showBox.stepper.value) * int(showBox.price_txt.text.slice(0,showBox.price_txt.text.indexOf("元"))) + "元宝";
         }
         else
         {
            if(int(showBox.stepper.textField.text) > showBox.stepper.maximum)
            {
               showBox.stepper.textField.text = showBox.stepper.maximum;
            }
            showBox.total_txt.text = int(showBox.stepper.textField.text) * int(showBox.price_txt.text.slice(0,showBox.price_txt.text.indexOf("元"))) + "元宝";
         }
         face._stage.removeEventListener(Event.ENTER_FRAME,stepperEnterFrame);
      }
   }
}

