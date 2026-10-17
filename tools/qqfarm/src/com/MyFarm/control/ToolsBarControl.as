package com.MyFarm.control
{
   import com.MyFarm.view.InstallFace;
   import flash.display.DisplayObject;
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
         face._tools.addEventListener(MouseEvent.ROLL_OVER,toolsOverHandler);
         face._tools.addEventListener(MouseEvent.ROLL_OUT,toolsOutHandler);
         face._stage.addEventListener(MouseEvent.MOUSE_DOWN,clickHandler);
      }
      
      private function clickHandler(param1:MouseEvent) : void
      {
         // Crossing the gap or moving over nested item artwork must not dismiss the pack.
         if(!face._tools.contains(param1.target as DisplayObject))
         {
            face._tools.getChildByName("PackBarBg").visible = false;
         }
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
               face._tools.getChildByName("PackBarBg").visible = true;
               face.changeMouse("CursorArrow");
            }
            else
            {
               face._tools.getChildByName("PackBarBg").visible = false;
            }
         }
         if(param1.target.name != "ButtonSeed" && (String(param1.target.name).indexOf("Seed") > 0 || String(param1.target.name).indexOf("Fertilizer") == 0))
         {
            face.changeMouse(param1.target.name);
            face._tools.getChildByName("PackBarBg").visible = false;
            Mouse.show();
            face._myMouse.visible = false;
         }
      }
      
      private function toolsOutHandler(param1:MouseEvent) : void
      {
         Mouse.hide();
         face._myMouse.visible = true;
      }
      
      private function toolsOverHandler(param1:MouseEvent) : void
      {
         Mouse.show();
         face._myMouse.visible = false;
      }
   }
}

