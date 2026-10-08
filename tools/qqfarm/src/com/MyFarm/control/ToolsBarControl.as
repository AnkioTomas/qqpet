package com.MyFarm.control
{
   import com.MyFarm.view.InstallFace;
   import flash.events.KeyboardEvent;
   import flash.events.MouseEvent;
   import flash.ui.Mouse;
   
   public class ToolsBarControl
   {
      
      private var face:InstallFace = InstallFace.getInstance();
      
      public function ToolsBarControl()
      {
         super();
         face._tools.addEventListener(MouseEvent.MOUSE_UP,toolsSelected);
         face._stage.addEventListener(KeyboardEvent.KEY_UP,keyUpHandler);
         face._tools.addEventListener(MouseEvent.MOUSE_OVER,toolsOverHandler);
      }
      
      private function clickHandler(param1:MouseEvent) : void
      {
         face._tools.getChildByName("PackBarBg").visible = false;
         face._bg.removeEventListener(MouseEvent.CLICK,clickHandler);
         face._tools.getChildByName("PackBarBg").removeEventListener(MouseEvent.ROLL_OUT,mouseOutHandler);
         face._tools.getChildByName("PackBarBg").removeEventListener(MouseEvent.ROLL_OVER,mouseOverHandler);
      }
      
      private function mouseOutHandler(param1:MouseEvent) : void
      {
         face._tools.getChildByName("PackBarBg").visible = false;
         face._bg.removeEventListener(MouseEvent.CLICK,clickHandler);
         face._tools.getChildByName("PackBarBg").removeEventListener(MouseEvent.ROLL_OUT,mouseOutHandler);
         face._tools.getChildByName("PackBarBg").removeEventListener(MouseEvent.ROLL_OVER,mouseOverHandler);
      }
      
      private function keyUpHandler(param1:KeyboardEvent) : void
      {
         if(param1.keyCode == 81)
         {
            face.changeMouse("CursorWater");
         }
         else if(param1.keyCode == 87)
         {
            face.changeMouse("CursorHook");
         }
         else if(param1.keyCode == 69)
         {
            face.changeMouse("CursorPesticide");
         }
         else if(param1.keyCode == 82)
         {
            face.changeMouse("CursorHand");
         }
      }
      
      private function mouseOverHandler(param1:MouseEvent) : void
      {
         face._tools.getChildByName("PackBarBg").addEventListener(MouseEvent.ROLL_OUT,mouseOutHandler);
      }
      
      private function toolsSelected(param1:MouseEvent) : void
      {
         if(param1.target.name == "CursorArrow" || param1.target.name == "CursorHand" || param1.target.name == "CursorHook" || param1.target.name == "CursorPesticide" || param1.target.name == "CursorWater" || param1.target.name == "CursorHoe")
         {
            face.changeMouse(param1.target.name);
         }
         if(param1.target.name == "ButtonSeed")
         {
            if(!face._tools.getChildByName("PackBarBg").visible)
            {
               face._bg.addEventListener(MouseEvent.CLICK,clickHandler);
               face._tools.getChildByName("PackBarBg").visible = true;
               face._tools.getChildByName("PackBarBg").addEventListener(MouseEvent.ROLL_OVER,mouseOverHandler);
               face.changeMouse("CursorArrow");
            }
            else
            {
               face._tools.getChildByName("PackBarBg").visible = false;
            }
         }
         if(String(param1.target.name).indexOf("Seed") > 0 || String(param1.target.name).indexOf("Fertilizer") == 0)
         {
            face.changeMouse(param1.target.name);
         }
      }
      
      private function toolsOutHandler(param1:MouseEvent) : void
      {
         Mouse.hide();
         face._myMouse.visible = true;
         face._tools.removeEventListener(MouseEvent.MOUSE_OUT,toolsOutHandler);
      }
      
      private function toolsOverHandler(param1:MouseEvent) : void
      {
         Mouse.show();
         face._myMouse.visible = false;
         face._tools.addEventListener(MouseEvent.MOUSE_OUT,toolsOutHandler);
      }
   }
}

