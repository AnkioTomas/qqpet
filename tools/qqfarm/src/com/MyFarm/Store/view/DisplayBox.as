package com.MyFarm.Store.view
{
   import com._public._displayObject.IntroductionText;
   import flash.display.DisplayObject;
   import flash.display.Loader;
   import flash.display.Sprite;
   import flash.display.Stage;
   import flash.events.Event;
   import flash.net.URLRequest;
   import flash.text.TextField;
   import flash.text.TextFormat;
   
   public class DisplayBox extends Sprite
   {
      
      private var bg:Sprite;
      
      private var _alpha:Number = 0.5;
      
      private var color:uint = 16777215;
      
      private var _height:Number = 50;
      
      private var priceColor:uint = 16737792;
      
      private var _width:Number = 50;
      
      private var lineColor:uint = 52479;
      
      private var txtColor:uint = 13395456;
      
      public function DisplayBox(param1:String, param2:Stage, param3:String, param4:DisplayObject = null, param5:String = "", param6:String = "")
      {
         var _loc7_:IntroductionText = null;
         var _loc8_:Loader = null;
         super();
         this.buttonMode = true;
         _loc7_ = new IntroductionText(this,param2,{
            "lineColor":16777215,
            "lineAlpha":0.5,
            "lineThickness":1,
            "bgColor":16777215,
            "bgAlpha":0.3,
            "txtColor":0,
            "contenttext":param6,
            "titletext":param5
         });
         addChild(_loc7_);
         bg = createShape();
         addChild(bg);
         inittext(param3);
         if(param1 != "")
         {
            _loc8_ = new Loader();
            _loc8_.load(new URLRequest(param1));
            _loc8_.contentLoaderInfo.addEventListener(Event.COMPLETE,loadCompleteHandler);
         }
         else if(param4 != null)
         {
            param4.x = 1 + (_width - param4.width) / 2;
            param4.y = 1 + (_height - param4.height) / 2;
            addChild(param4);
         }
      }
      
      private function createShape() : Sprite
      {
         var _loc1_:Sprite = null;
         _loc1_ = new Sprite();
         _loc1_.graphics.lineStyle(1,lineColor);
         _loc1_.graphics.beginFill(color,_alpha);
         _loc1_.graphics.drawRect(0,0,_width + 2,_height + 2);
         _loc1_.graphics.endFill();
         return _loc1_;
      }
      
      private function loadCompleteHandler(param1:Event) : void
      {
         param1.target.content.width = _width;
         param1.target.content.height = _height;
         param1.target.content.x = 1;
         param1.target.content.y = 1;
         addChild(param1.target.content);
      }
      
      private function inittext(param1:String) : void
      {
         var _loc2_:TextField = null;
         var _loc3_:TextField = null;
         var _loc4_:TextFormat = null;
         _loc2_ = new TextField();
         _loc2_.text = "元宝:";
         _loc2_.textColor = txtColor;
         _loc2_.autoSize = "left";
         _loc2_.y = _height + 5;
         _loc2_.mouseEnabled = false;
         addChild(_loc2_);
         _loc3_ = new TextField();
         _loc3_.text = param1;
         _loc3_.autoSize = "left";
         _loc3_.textColor = priceColor;
         _loc4_ = new TextFormat();
         _loc4_.bold = true;
         _loc3_.setTextFormat(_loc4_);
         _loc3_.x = _loc2_.width;
         _loc3_.y = _height + 5;
         _loc3_.mouseEnabled = false;
         addChild(_loc3_);
      }
   }
}

