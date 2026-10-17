package com.MyFarm.control
{
   import com.MyFarm.view.InstallFace;
   import com._public._util.DragTools;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.external.ExternalInterface;
   import flash.geom.Rectangle;
   import flash.ui.Mouse;
   
   public class Control
   {
      
      public static var instance:Control;
      
      private var toolsBarControl:ToolsBarControl;
      
      private var dragTools:DragTools;
      
      private var face:InstallFace = InstallFace.getInstance();
      
      private var titleControl:TitleControl;
      
      private var rectangle:Rectangle;
      
      private var reclamationControl:ReclamationControl;
      
      private var startX:Number;
      
      private var startY:Number;
      
      private var farmlandControl:FarmlandControl;
      
      public function Control()
      {
         super();
      }
      
      public static function getInstance() : Control
      {
         if(instance == null)
         {
            return instance = new Control();
         }
         return instance;
      }
      
      public function installControl() : void
      {
         Mouse.hide();
         face._bg.addEventListener(MouseEvent.MOUSE_OVER,mouseOverHandler);
         if(farmlandControl == null)
         {
            farmlandControl = new FarmlandControl();
            reclamationControl = new ReclamationControl();
            toolsBarControl = new ToolsBarControl();
            titleControl = new TitleControl();
            dragTools = new DragTools(face._bg,{"methods":"bitmap"});
            if(ExternalInterface.available)
            {
               ExternalInterface.addCallback("farmView",face.toggleFarmView);
            }
         }
      }
      
      private function onMove(param1:MouseEvent) : void
      {
         // A click that wobbles must stay a click: dragging hides the farm behind a bitmap, and the click lands on that.
         if(Math.abs(startX - face._stage.mouseX) > 10 || Math.abs(startY - face._stage.mouseY) > 10)
         {
            face._stage.removeEventListener(MouseEvent.MOUSE_MOVE,onMove);
            dragTools.beginDrag(false,rectangle);
         }
      }
      
      private function enterFrameHandler(param1:Event) : void
      {
         face._myMouse.x = face._stage.mouseX;
         face._myMouse.y = face._stage.mouseY;
      }
      
      private function mouseUpHandler(param1:MouseEvent) : void
      {
         if(face._myMouse.name == "CursorArrow")
         {
            face._myMouse.gotoAndStop(1);
         }
         dragTools.endDrag();
         rectangle = null;
         face._stage.removeEventListener(MouseEvent.MOUSE_MOVE,onMove);
         face._stage.removeEventListener(MouseEvent.MOUSE_UP,mouseUpHandler);
         if(face._myMouse.name != "CursorArrow")
         {
            face._myMouse.gotoAndPlay(2);
         }
      }
      
      private function mouseDownHandler(param1:MouseEvent) : void
      {
         if(face._myMouse.name == "CursorArrow")
         {
            face._myMouse.gotoAndPlay(2);
         }
         startX = face._stage.mouseX;
         startY = face._stage.mouseY;
         var bounds:Rectangle = face._bg.getBounds(face._bg);
         var left:Number = Math.min(0,face._stage.stageWidth - bounds.right * face._bg.scaleX);
         var top:Number = Math.min(0,face._stage.stageHeight - bounds.bottom * face._bg.scaleY);
         rectangle = new Rectangle(left,top,Math.max(0,-bounds.x * face._bg.scaleX - left),Math.max(0,-bounds.y * face._bg.scaleY - top));
         face._stage.addEventListener(MouseEvent.MOUSE_MOVE,onMove);
         face._stage.addEventListener(MouseEvent.MOUSE_UP,mouseUpHandler);
      }
      
      private function mouseOverHandler(param1:MouseEvent) : void
      {
         face._stage.addEventListener(MouseEvent.MOUSE_MOVE,enterFrameHandler);
         face._bg.addEventListener(MouseEvent.MOUSE_DOWN,mouseDownHandler);
      }
   }
}

