package com.MyFarm
{
   import com.MyFarm.data.UserInfo;
   import com.MyFarm.view.InstallFace;
   import flash.display.Loader;
   import flash.display.LoaderInfo;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.display.StageAlign;
   import flash.display.StageScaleMode;
   import flash.events.Event;
   import flash.events.ProgressEvent;
   import flash.net.SharedObject;
   import flash.net.URLLoader;
   import flash.net.URLRequest;
   
   [SWF(width="700", height="550", backgroundColor="#ffffff", frameRate="20")]
   public class FarmMain extends Sprite
   {
      
      private var loader:Loader;
      
      private var movie:MovieClip;
      
      private var loadingBar:MovieClip;
      
      private var urlloader2:URLLoader;
      
      private var urlloader:URLLoader;
      
      private var face:InstallFace;
      
      private var skinXml:XML;
      
      private var num:uint;
      
      private var cropXmlUrl:String = "com/MyFarm/data/xml/Crop.xml";
      
      private var skinXmlUrl:String = "com/MyFarm/data/xml/skin.xml";
      
      private var isLocation:Boolean;
      
      public function FarmMain()
      {
         super();
         isLocation = stage.loaderInfo.url.substr(0,8) == "file:///" ? true : true;
         stage.scaleMode = StageScaleMode.NO_SCALE;
         stage.align = StageAlign.TOP_LEFT;
         if(isLocation)
         {
            this.addEventListener(Event.ADDED_TO_STAGE,locationInit);
         }
      }
      
      private function skinLoadProgress(param1:ProgressEvent) : void
      {
         var _loc2_:uint = 0;
         if(movie.currentFrame == 58)
         {
            movie.gotoAndPlay("loading");
         }
         _loc2_ = uint(int(param1.bytesLoaded / param1.bytesTotal * 100));
         loadingBar.gotoAndStop(_loc2_);
         loadingBar.txt.text = "加载" + skinXml.skin[num].@name + _loc2_ + "%";
      }
      
      private function loopLoadSkin() : void
      {
         loader = new Loader();
         loader.load(new URLRequest(skinXml.skin[num].@url));
         loader.contentLoaderInfo.addEventListener(Event.COMPLETE,skinLoadComplete);
         loader.contentLoaderInfo.addEventListener(ProgressEvent.PROGRESS,skinLoadProgress);
      }
      
      private function skinLoadComplete(param1:Event) : void
      {
         if(skinXml.skin[num].@name == "道具")
         {
            face.loaderInfo = LoaderInfo(param1.target);
         }
         ++num;
         if(num < skinXml.skin.length())
         {
            loopLoadSkin();
         }
         else
         {
            loader.contentLoaderInfo.removeEventListener(Event.COMPLETE,skinLoadComplete);
            loader.contentLoaderInfo.removeEventListener(ProgressEvent.PROGRESS,skinLoadProgress);
            loader = null;
            this.removeChild(movie);
            movie = null;
            this.removeChild(loadingBar);
            loadingBar = null;
            face._stage = stage;
            face.install();
         }
         loader = null;
         movie = null;
         loadingBar = null;
         urlloader = null;
      }
      
      private function locationInit(param1:Event) : void
      {
         var _loc2_:SharedObject = null;
         var _loc3_:UserInfo = null;
         _loc2_ = SharedObject.getLocal("test","/");
         face = InstallFace.getInstance();
         if(_loc2_.data.user != undefined)
         {
            face._user = _loc2_.data.user;
         }
         else
         {
            _loc3_ = new UserInfo();
            _loc3_.username = "咸鱼";
            _loc3_.wealth = "2000";
            _loc3_.house = "house";
            _loc3_.kennel = "kennel";
            _loc3_.fence = "fence";
            _loc3_.experience = "1";
            _loc3_.rank = "01";
            _loc3_.burden = new Array();
            _loc3_.warehouse = new Array();
            _loc3_.farmland = new Array({"farmland":"FarmlandS"},{"farmland":"FarmlandS"},{"farmland":"FarmlandS"},{"farmland":"FarmlandS"},{"farmland":"FarmlandS"},{"farmland":"FarmlandS"},{"farmland":"Wasteland"},{"farmland":"Wasteland"},{"farmland":"Wasteland"},{"farmland":"Wasteland"},{"farmland":"Wasteland"},{"farmland":"Wasteland"},{"farmland":"Wasteland"},{"farmland":"Wasteland"},{"farmland":"Wasteland"},{"farmland":"Wasteland"},{"farmland":"Wasteland"},{"farmland":"Wasteland"});
            _loc3_.burden = new Array();
            _loc3_.warehouse = new Array();
            _loc3_.weather = "Sunny";
            _loc2_.data.user = _loc3_;
            _loc2_.flush();
            face._user = _loc3_;
            _loc3_ = null;
         }
         _loc2_ = null;
         movie = new openingMovie();
         movie.x = (stage.stageWidth - 172) / 2;
         movie.y = (stage.stageHeight - 400) / 2;
         addChild(movie);
         loadingBar = new progressBar();
         loadingBar.x = (stage.stageWidth - loadingBar.width) / 2;
         loadingBar.y = (stage.stageHeight - loadingBar.height) / 2;
         loadingBar.txt.mouseEnabled = false;
         addChild(loadingBar);
         urlloader = new URLLoader(new URLRequest(skinXmlUrl));
         urlloader.addEventListener(Event.COMPLETE,loadedSkinXmlComplete);
      }
      
      private function loadedSkinXmlComplete(param1:Event) : void
      {
         urlloader.removeEventListener(Event.COMPLETE,loadedSkinXmlComplete);
         urlloader = null;
         skinXml = XML(param1.target.data);
         urlloader2 = new URLLoader(new URLRequest(cropXmlUrl));
         urlloader2.addEventListener(Event.COMPLETE,loadCropXmlComplete);
      }
      
      private function loadCropXmlComplete(param1:Event) : void
      {
         face.cropXml = XML(param1.target.data);
         loopLoadSkin();
      }
   }
}

