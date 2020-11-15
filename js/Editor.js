let E;

$(document).ready(function() {
	E = new Editor();
});

class DrawStage extends createjs.MovieClip {
	constructor() {
		super();
	
		this.Frame = new createjs.MovieClip();
		this.LastFrame = new createjs.MovieClip();
		this.Holder = new createjs.Shape();
		
		this.Holder.graphics.beginFill('#ffffff').beginStroke('#000000').drawRect(0, 0, 1000, 650);
		
		this.addChild(this.Holder);
		this.addChild(this.LastFrame);
		this.addChild(this.Frame);
	}
}

class Editor {
	constructor(TId) {
		this.Cam = new createjs.Stage('camera');
		
		this.Stage = new createjs.Stage('editor');
		this.Stage.mouseMoveOutside = true;
		createjs.Touch.enable(this.Stage);
		
		createjs.Ticker.framerate = 120;
		createjs.Ticker.addEventListener('tick', this.Draw.bind(this));
		
		this.TId = 0;

		this.Init();
	}
	
	Init(D) {
		this.MayDraw = true;
		this.IsPlaying = false;
		this.ZoomEnabled = false;
		
		this.FR = 0;
		this.Line = 0;
		
		this.Data = [];
		this.CopyB = [];
		this.LightFrames = [0];
		this.L = 2;
		
		this.Camera = new createjs.Point(500, 325);
		
		this.PF = 0;
		
		this.Old = 0;
		
		//Draw
		this.DrawStage = new DrawStage();
		this.DrawStage.Holder.addEventListener('mousedown', this.Down.bind(this));
		this.DrawStage.Holder.addEventListener('pressmove', this.Move.bind(this));
		this.DrawStage.Holder.addEventListener('pressup', this.Up.bind(this));
		this.Stage.addChild(this.DrawStage);
		
		//HTML
		window.onbeforeunload = this.CloseConfirm;
		
		$(window).bind('resize', this.Resize.bind(this));
		$('body').bind('keydown', this.HotKey.bind(this));
		$('body').bind('keyup', this.HotKeyUp.bind(this));
		
		$('.editor .tools .color').bind('change', this.SetColor.bind(this));
		$('.editor .tools .color_label').bind('keydown', this.SetColor.bind(this));
		
		$('.editor .tools .fps').bind('input', this.SetFPS);
		$('.editor .tools .lightbox').bind('input', this.SetLight);
		$('.editor .tools .scale').bind('input', this.SetScale);
		
		$('.editor .tools .control').bind('mousedown', this.Control.bind(this));
		$('.editor .tools .control').bind('mouseup', this.ControlUp.bind(this));
			
		
		this.ToonFPS = (D ? D.Data.FPS : 13);
		
		setInterval(this.Allow.bind(this), 25);
		this.PlayInterval = setInterval(this.FPlay.bind(this), 1000/this.ToonFPS);
		
		if(D) {
			this.HotKeys = {
				'37': this.PrevFrame,
				'39': this.NextFrame,
				'70': this.FullScreen,
				'76': this.ZoomIn,
				'80': this.Play,
				'90': this.Undo,
				'107': this.ZoomPlus,
				'109': this.ZoomMinus,
				'187': this.ZoomPlus,
				'189': this.ZoomMinus,
				
				'67': this.Copy,
				'77': this.Merge,
				'86': this.Paste
			}
			
			this.Orig = D.Frames;
			
			$('.speedy').remove();
			$('.control.ui.add').remove();
			$('.control.ui.remove').remove();
			
			$('.editor .tools .fps').val(this.ToonFPS);
			
			for(let FR = 0; FR < this.Orig.length; FR++) {
				for(let i = 0; i < this.Orig[FR].length; i++) {
					let Line = new createjs.Shape();
					let Cs = this.Orig[FR][i]['Cs'];
					for(let j = 0; j < Cs.length; j++) {
						if(!j) {
							Line.graphics	.setStrokeStyle(this.Orig[FR][i]['Width'], 'round', 'round')
											.beginStroke(this.Orig[FR][i]['Color'])
											.lineTo(Cs[j].x, Cs[j].y);
						}
						else {
							Line.graphics	.quadraticCurveTo(Cs[j-1].x, Cs[j-1].y, (Cs[j].x + Cs[j-1].x)/2, (Cs[j].y + Cs[j-1].y)/2)
											.moveTo((Cs[j].x + Cs[j-1].x)/2, (Cs[j].y + Cs[j-1].y)/2);
						}
					}
					this.Orig[FR][i]['Ex'] = Line;
				}
				this.Data.push([]);
				$('.tools .timeline').append(`<div class="frame${(FR == 0 ? ' selected' : '')}" id="f${FR}"><p>${FR + 1}</p></div>`);
			}
			$('.frame').bind('click', this.SetFrame);
			
			this.UpdateFrame(0);
		}
		else {
			this.HotKeys = {
				'37': this.PrevFrame,
				'39': this.NextFrame,
				'65': this.AddFrame,
				'67': this.Copy,
				'70': this.FullScreen,
				'76': this.ZoomIn,
				'77': this.Merge,
				'80': this.Play,
				'82': this.RemoveFrame,
				'86': this.Paste,
				'90': this.Undo,
				'107': this.ZoomPlus,
				'109': this.ZoomMinus,
				'187': this.ZoomPlus,
				'189': this.ZoomMinus
			}
		
			this.NewFrame(0);
		}
	}
	
	CloseConfirm(e) {
		if(E.Data.length == 1 && !E.Data[0].length) return;
			
		e.cancelBubble = true;
		e.returnValue = L.T('Are you sure to close editor? The toon will not be saved!');
		e.stopPropagation();
		e.preventDefault();
	}
	
	FullScreen() {
		if(!document.fullscreenElement) {
			$('.editor')[0].requestFullscreen();
		}
		else {
			document.exitFullscreen();
		}
	}
	Resize(e) {
		E.ScaleUpdate(true);
		E.DrawStage.x = 0;
		E.DrawStage.y = 0;
		//E.Stage.canvas.width = $('.editor').width();
		//E.Stage.canvas.height = $('.editor').height();
	}
	
	ZoomIn() {
		E.ZoomEnabled = !E.ZoomEnabled;
		
		if(!E.ZoomEnabled) 
			$(`.control#76`).removeClass('select');
	}
	ZoomPlus() {
		if(E.DrawStage.scaleX >= 10 || !E.ZoomEnabled) return;
		E.DrawStage.scaleX += .1;
		E.DrawStage.scaleY += .1;
		$('.editor .tools .scale').val(E.DrawStage.scaleX);
		E.ScaleUpdate();
	}
	ZoomMinus() {
		if(E.DrawStage.scaleX <= .5 || !E.ZoomEnabled) return;
		E.DrawStage.scaleX -= .1;
		E.DrawStage.scaleY -= .1;
		$('.editor .tools .scale').val(E.DrawStage.scaleX);
		E.ScaleUpdate();
	}
	SetScale(e) {
		E.DrawStage.scaleX = e.target.value*1;
		E.DrawStage.scaleY = e.target.value*1;
		E.ScaleUpdate();
	}
	ScaleUpdate(F) {
		if(!F) {
			E.CameraMove({'stageX': E.Camera.x, 'stageY': E.Camera.y, 'artifical': true});
			F = E.Camera;
		}
		
		let A = new createjs.MovieClip();
		
		A.scaleX = .2;
		A.scaleY = .2;
		
		if(E.Orig) {
			for(let i = 0; i < this.Orig[E.FR].length; i++) {
				A.addChild(this.Orig[E.FR][i].Ex.clone());
			}
		}
		
		for(let i = 0; i < E.FD.length; i++) {
			A.addChild(E.FD[i].Ex.clone());
		}
		
		let D = {'w': Math.min($('body').width(), E.Stage.canvas.width), 'h': Math.min($('body').height(), E.Stage.canvas.height)};
		
		let B = new createjs.Shape();
		B.scaleX = .2;
		B.scaleY = .2;
		B.graphics.setStrokeStyle(10).beginStroke('#ff0000').drawRect(Math.abs(F.x) / E.DrawStage.scaleX, Math.abs(F.y) / E.DrawStage.scaleY, D.w / E.DrawStage.scaleX, D.h / E.DrawStage.scaleY);
		
		E.Cam.removeAllChildren();
		E.Cam.addChild(A);
		E.Cam.addChild(B);
	}
	
	CameraDown(e) {
		this.Camera = new createjs.Point(e.stageX, e.stageY);
		$('.camera').fadeOut(200);
	}
	CameraMove(e) {
		let Bnds = {'w': Math.min($('body').width(), E.Stage.canvas.width), 'h': Math.min($('body').height(), E.Stage.canvas.height)};
		let Target = new createjs.Point(e.stageX * 1000 / Bnds.w, e.stageY * 650 / Bnds.h);
		
		let C = {'x': (2 * E.DrawStage.scaleX) * (-Target.x / 2) + Bnds.w / 2, 'y': (2 * E.DrawStage.scaleY) * (-Target.y / 2) + Bnds.h / 2};

		let D = {'x': Bnds.w - (1000 * E.DrawStage.scaleX), 'y': Bnds.h - (650 * E.DrawStage.scaleY)};
		
		let F = {
			'x': (C.x >= 0 ? Math.min(0, C.x) : Math.max(C.x, D.x)),
			'y': (C.y >= 0 ? Math.min(0, C.y) : Math.max(C.y, D.y))
		}
		
		E.Stage.x = F.x;
		E.Stage.y = F.y;
		
		//console.log(Target);
		
		if(!e.artifical) {
			$('.camera').fadeIn(200);
			E.ScaleUpdate(F);
		}
	}
	
	SetColor(e) {
		if(e.target.value.length < 7)
			return;
		
		$('.editor .tools .color').val(e.target.value);
		$('.editor .tools .color_label').val(e.target.value);
	}
	Draw() {
		this.Stage.update();
		this.Cam.update();
	}
	Control(e) {
		this.HotKey({'keyCode': $(e.target).attr('id')});
	}
	ControlUp(e) {
		this.HotKeyUp({'keyCode': $(e.target).attr('id')});
	}
	HotKey(e) {
		if($('input:not([type="button"]):focus').length || $('textarea:focus').length)
			return;
		
		if(this.HotKeys[e.keyCode]) {
			$(`.control#${e.keyCode}`).addClass('select');
			this.HotKeys[e.keyCode]();
		}
	}
	HotKeyUp(e) {
		if($('input:not([type="button"]):focus').length || $('textarea:focus').length)
			return;
		
		if(this.HotKeys[e.keyCode]) {
			if($(`.control#${e.keyCode}`)[0] && $(`.control#${e.keyCode}`)[0].className.indexOf('fixed') == -1) $(`.control#${e.keyCode}`).removeClass('select');
		}
	}
	SetFPS(e) {		
		clearInterval(E.PlayInterval);
		E.ToonFPS = e.target.value;
		E.PlayInterval = setInterval(E.FPlay.bind(E), 1000/E.ToonFPS);
	}
	
	PrevFrame(e) {
		if(E.IsPlaying) return;
		if(E.Frame > 0)
			E.Frame--;
	}
	NextFrame(e) {
		if(E.IsPlaying) return;
		if(E.Frame + 1 < E.Data.length)
			E.Frame++;
	}
	
	
	SetLight(e) {
		E.Light = e.target.value;
	}
	UpdLight() {
		this.DrawStage.LastFrame.removeAllChildren();
		for(let i = 1; i <= this.Light; i++) {
			let F = new createjs.MovieClip();
			F.alpha = .75 / this.Light / i;
			
			if(this.LightFrames[i] >= 0 && this.Data[this.LightFrames[i]]) {
				for(let j = 0; j < this.Data[this.LightFrames[i]].length; j++) {
					F.addChild(this.Data[this.LightFrames[i]][j].Ex);
				}
			}
			
			this.DrawStage.LastFrame.addChild(F);
		}
	}
	get Light() {
		return this.L;
	}
	set Light(V) {
		this.L = V;
		this.UpdLight();
	}
	
	Play() {
		E.IsPlaying = !E.IsPlaying;
		E.MayDraw = !E.IsPlaying;
		E.DrawStage.LastFrame.visible = !E.IsPlaying;
		if(!E.IsPlaying) E.UpdateFrame(E.FR);
		E.PF = 0;
	}
	get CL() {
		return this.FD[this.Line];
	}
	get FD() {
		return this.Data[this.Frame];
	}
	set FD(V) {
		this.Data[this.Frame] = V;
	}
	
	//<FRAMES
	get Frame() {
		return this.FR;
	}
	set Frame(Val) {
		this.FR = Val;
		
		this.LightFrames.unshift(Val);
		if(this.LightFrames.length > 5)
			this.LightFrames.splice(-1, 1);
		
		this.UpdateFrame(Val);
		
		$(`.frame.selected`).removeClass('selected');
		$(`.frame#f${Val}`).addClass('selected');
	}
	AddFrame() {
		E.Frame = 1 * E.NewFrame(E.Frame + 1);
	}
	NewFrame(Num) {
		this.Data.splice(Num, 0, []);
				
		$('.frame.selected').removeClass('selected');
		
		if(Num > 0) 
			$(`.frame#f${Num - 1}`).after(`<div class="frame selected" id="f${Num}"><p>${Num + 1}</p></div>`);
		else
			$('.tools .timeline').append(`<div class="frame selected" id="f${Num}"><p>${Num + 1}</p></div>`);
		
		$('.frame.selected').bind('click', this.SetFrame);
		
		for(let i = 0; i < $('.tools .timeline').children().length; i++) {
			$(`.frame:nth-child(${i+1})`).attr('id', `f${i}`);
			$(`.frame:nth-child(${i+1}) p`).text(i+1);
		}
	
		//$('.tools .timeline').scrollLeft($('.frame.selected').offset().left);
		
		return Num;
	}
	RemoveFrame() {
		if(E.Data.length <= 1) return;
		
		let F = E.Frame;
		
		E.Data.splice(F, 1);
		E.Frame = (F > E.Data.length - 1 ? F - 1 : F);
		
		$(`.frame#f${F}`).remove();
		
		for(let i = 0; i < $('.tools .timeline').children().length; i++) {
			$(`.frame:nth-child(${i+1})`).attr('id', `f${i}`);
			$(`.frame:nth-child(${i+1}) p`).text(i+1);
		}
		
		$(`.frame#f${E.Frame}`).addClass('selected');
	}
	FPlay() {
		if(!this.IsPlaying) return;
		
		this.UpdateFrame(this.PF, true);
		
		if(this.PF < this.Data.length - 1)
			this.PF++;
		else
			this.PF = 0;
	}
	SetFrame(e) {
		if(E.IsPlaying) return;
		
		if($(e.target)[0].tagName != 'DIV')
			E.Frame = $(e.target).parent().attr('id').split('f')[1] * 1;
		else
			E.Frame = $(e.target).attr('id').split('f')[1] * 1;
	}
	UpdateFrame(Num, Play) {
		this.UpdLight();
		
		this.DrawStage.Frame.removeAllChildren();
		
		if(this.Orig) {
			for(let i = 0; i < this.Orig[Num].length; i++) {
				this.DrawStage.Frame.addChild(this.Orig[Num][i].Ex);
			}
		}
		
		for(let i = 0; i < this.Data[Num].length; i++) {
			this.DrawStage.Frame.addChild(this.Data[Num][i].Ex);
		}
		
		$('.frame.selected')[0].scrollIntoView({inline: 'center'});
	}
	//FRAMES>
	
	Allow() {
		if(!this.MayDraw && !this.IsPlaying) this.MayDraw = true;
	}
	Undo() {
		E.FD.splice(E.FD.length - 1, 1);
		E.UpdateFrame(E.FR);
		
		E.DrawStage.LastFrame.visible = false;
		$(`.timeline .frame#f${E.FR}`).attr('style', `background-image: url(${E.Stage.canvas.toDataURL('image/png')});`);
		E.DrawStage.LastFrame.visible = true;
	}
	
	Copy() {
		E.CopyB = E.FD;
	}
	Paste() {
		if(!E.CopyB.length) return;
		
		E.FD = [];
		E.FD = E.FD.concat(E.CopyB);
		E.UpdateFrame(E.FR);
		
		E.DrawStage.LastFrame.visible = false;
		$(`.timeline .frame#f${E.FR}`).attr('style', `background-image: url(${E.Stage.canvas.toDataURL('image/png')});`);
		E.DrawStage.LastFrame.visible = true;
	}
	Merge() {
		if(!E.CopyB.length) return;
		
		E.FD = E.FD.concat(E.CopyB);
		E.UpdateFrame(E.FR);
		
		E.DrawStage.LastFrame.visible = false;
		$(`.timeline .frame#f${E.FR}`).attr('style', `background-image: url(${E.Stage.canvas.toDataURL('image/png')});`);
		E.DrawStage.LastFrame.visible = true;
	}
	
	Down(e) {
		$('input').blur();
		
		if(E.ZoomEnabled) {
			this.CameraDown(e);
			return;
		}
		
		if(this.MayDraw)
			this.MayDraw = !this.MayDraw;
		else
			return;
		
		let Line = new createjs.Shape();

		let Color = ($('.color_label').val() ? $('.color_label').val() : '#000000');
		let Width = ($('.width').val() ? $('.width').val() : 5);
		
		let C = e.target.globalToLocal(e.stageX, e.stageY);
		
		Line.graphics	.setStrokeStyle(Width, 'round', 'round')
						.beginStroke(Color)
						.lineTo(C.x, C.y);
		
		this.DrawStage.Frame.addChild(Line);
		
		this.Line = this.Data[this.Frame].push({'Ex': Line, 'Color': Color, 'Width': Width, 'Cs': [{x: C.x, y: C.y}]}) - 1;
	}
	Move(e) {
		if(this.MayDraw)
			this.MayDraw = !this.MayDraw;
		else
			return;
		
		if(E.ZoomEnabled) {
			this.CameraMove(e);
			return;
		}
		
		let Cs = e.target.globalToLocal(e.stageX, e.stageY);
		
		let C = this.CL.Cs.push({x: Cs.x, y: Cs.y}) - 1;

		this.CL.Ex.graphics	.quadraticCurveTo(this.CL.Cs[C-1].x, this.CL.Cs[C-1].y, (this.CL.Cs[C].x + this.CL.Cs[C-1].x)/2, (this.CL.Cs[C].y + this.CL.Cs[C-1].y)/2)
							.moveTo((this.CL.Cs[C].x + this.CL.Cs[C-1].x)/2, (this.CL.Cs[C].y + this.CL.Cs[C-1].y)/2);
		
		E.DrawStage.LastFrame.visible = false;
		$(`.timeline .frame#f${E.FR}`).attr('style', `background-image: url(${E.Stage.canvas.toDataURL('image/png')});`);
		E.DrawStage.LastFrame.visible = true;
	}
	Up(e) {
		if(E.ZoomEnabled) {
			this.CameraDown(e);
			return;
		}
	}
}