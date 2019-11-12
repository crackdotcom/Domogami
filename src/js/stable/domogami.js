/***********************
*	DOMOGAMI.ACT => Object
*	args : Object => {?debug:boolean, ?ignoreClickActs:false}
*	return : Object => DOMOGAMI
*	description: This is the core OBJECT.  It controls the communication between the php server and the clients document. Parameters passed to it on initialization must be on the form of an OBJECT.  All other third party API's are wrapped under DOMOGAMI's Scope.
************************/
class DOMOGAMI{
	constructor(
		args = {
		debug:false,
		ignoreBreadcrumbs:false,
		events:[
			'click',
			'keydown',
			'change',
			'pageshow',
			'popstate'
			]
		}
	){
		this._debug = args.debug
		this._startedOn = Date.now()
		//this._stack = [] <- might think about implementing and IO stack.
		this._formBank = {}
		this._defaultPopupText = '<div class="loading"></div>'
		this._screenlocked = false
		this._maxRecursionSteps = args.maxRecursionSteps || 12		
		this._ignoreBreadcrumbs = args.ignoreBreadcrumbs || false
		
		this._callbackFailsafe = null
		this._activeWebGLScene = null
			
		this._buildActs()
		this._bindings(args)

		if(this.debug){
			console.log(this)
		}
		
		this.runAct('CheckCallbackActs', {})		
	}	
	
	/***********************
	*	_buildActs => Private Method
	*	description: Private method used by used by the constructor.  Creates Default Actions, careful when editing this.
	************************/
	_buildActs(){
		
		this._ACTS = {}
		/* DEFAULT ACT SECTION */
		
		/*- CheckBreadcrumbs-*/		
		this.CreateAction('CheckBreadcrumbs', (e,parent)=>{			
			//e.preventDefault()		
			
			if(parent.ignoreBreadcrumbs){
				return false
			}
			
			let hash
			if(window.location.hash){
				console.log("BREADCRUMB HASH!")
			}
			/*if(
			((e.target.getAttribute) &&
			(e.target.getAttribute('href'))) && 
			 e.target.getAttribute('href').split){
				hash = e.target.getAttribute('href').split('#')[1] || false
				if(hash){
					console.log("BREADCRUMB HASH!")
				}
			}*/	
			
			var params = parent.checkLocation()
			var po = {}
			for(let i=0; i<params.length; i++){
				var p = params[i].split('=')
				if(p.length == 1){
					po[p[0]] = true					
				}else{
					po[p[0]] = p[1]
				}				
			}
			
			console.log(po)
			
			if(po.m){
				if(po.dt){
					var dt = document.getElementById(po.dt)
					console.log(dt)
					//Check of Module is there!
					var el = false;
					if(dt){
						el = dt.querySelector('.'+po.m)
					}					
					if(!el){
					
						var argsString = ''						
						if(po.dt){
							argsString+='domTarget:'+po.dt+';'
						}						
						if(po.ct){
							argsString+='clearTarget;'
						}
						if(po.inj){
							argsString+='inject;'
						}
				
						if(parent.callbackFailsafe == argsString+po.m){
							return
						}										
						parent.callbackFailsafe = argsString+po.m	
						
						var ft = parent.createEventElement(
						{
							module: po.m,
							args : argsString,
							href :  hash || '#'
						}, 
						'a'
						)
						
						parent.runAct('OpenModule', ft)
					}
				}				
			}
			
		})
		/*- end CheckBreadcrumbs-*/
		

		/*- INPUT -*/
		/*- Validate Input-*/		
		this.CreateAction('Validate', (e,parent)=>{
			var t = e.target
			var key = t.getAttribute('validationType')                        
            var fromRoot = t.getAttribute('fromRoot') || true
            
            if(fromRoot === 'true'){
                fromRoot = true
            }else{
                fromRoot = false
            }
			
            console.log('fromRoot', fromRoot)
            
			var data = {}	
			
			data.state = key
			data.value = t.value	
            
            console.log(data)
			
			t.classList.add('proccessing')
			t.classList.remove('flagged-ok', 'flagged-bad')
			
			parent.getData('validate', (response)=>{
				console.log(response)                                
				t.classList.remove('proccessing')				
				if(response.type == 'Success'){	
					t.classList.remove('flagged-bad')
					t.classList.add('flagged-ok')
				}else if(response.type == 'Error'){
					t.classList.add('flagged-bad')
					t.classList.remove('flagged-ok')
                    new DOMOGAMI.ERRORTIP({msg:(response.message || response)}, this)
				}else{				
					new DOMOGAMI.ERRORTIP({msg:(response.message || response)}, this)			
					t.classList.add('flagged-bad')
					t.classList.remove('flagged-ok')			
				}	
				
			}, data, true, fromRoot)
		})
		/*- end Validate Input-*/
		
		/*- ClearOtherInput -*/		
		this.CreateAction('ClearOtherInput', (e,parent)=>{
			
			var t = e.target
			var key = t.getAttribute('clearTarget')
			var el = document.querySelector('[id="'+key+'"]')
				el.classList.remove('flagged-bad', 'flagged-ok')
			
			if(t.getAttribute('deflag')){
				t.classList.remove('flagged-bad', 'flagged-ok')
			}
			
			el.value = ''			
		})
		/*- end ClearOtherInput-*/
		
		/*- SameAsOtherInput -*/		
		this.CreateAction('SameAsOtherInput', (e,parent)=>{
			var t = e.target
			t.classList.remove('flagged-bad', 'flagged-ok')
			var key = t.getAttribute('checkTarget')
			var el = document.querySelector('[id="'+key+'"]')
			
			if(t.getAttribute('flagBoth')){el.classList.remove('flagged-ok', 'flagged-bad')};
			
			var val = el.value;
			
			if(t.value != val){
				t.classList.add('flagged-bad')
			}else{
				t.classList.add('flagged-ok')
				if(t.getAttribute('flagBoth')){
				el.classList.add('flagged-ok')
				}			
			}
		})
		/*- end SameAsOtherInput-*/
		
		/*- CloseFullscreenPopup -*/		
		this.CreateAction('CloseFullscreenPopup', (e,parent)=>{
			var popup = document.querySelector('.fullscreen-module');
			popup.remove();
		})
		/*- end CloseFullscreenPopup-*/
	
		/*- Open Module -*/
		this.CreateAction('OpenModule', (e,parent)=>{			
			
			if(e.preventDefault){
				e.preventDefault()
			}	
			
			let t = e.target
			if(!t){return}
			let module = t.getAttribute('module')
			if(!module){return}
			let _args, _postData
			
			if(t.getAttribute('args')){
				_args = parent.parseAttrArray(t.getAttribute('args'))
			}			
			if(t.getAttribute('postData')){
				_postData = parent.parseAttrArray(t.getAttribute('postData'))
			}
			
			let hash
			if((e.target.getAttribute('href')) && e.target.getAttribute('href').split){
				hash = e.target.getAttribute('href').split('#')[1] || false
				if(hash){
					window.location += "#"+hash
				}
			}			
			
			let popup = document.createElement('div')
			popup.classList.add('module')
	
			let xhttp = new XMLHttpRequest()
	
			function complete(response){				
				console.log("complete!:args ",_args)
				if(_args.inject){
					console.log('Injecting')
                    e.target.innerHTML = response
				}else{
					popup.innerHTML = response
				}				
				
				if(window.location.hash){
					console.log("Location HASH!")					
					let el = document.getElementById(location.hash.split('#')[1])
					if(el){
						el.scrollIntoView()
					}
					parent.runAct('CheckBreadcrumbs', e)
				}
				
				
				parent.runAct('CheckCallbackActs', e)	
			}
		
			//ARGUMENT HANDLES;
		
			if(_args.fullscreen){
				let _op = document.querySelector('.fullscreen-module')
				
				if(_op){
					_op.remove()
				}
				
				popup.classList.add('fullscreen-module')
				popup.setAttribute('clickAct', 'CloseFullscreenPopup')	
				
			}	
	
			popup.innerHTML = parent.defaultPopupText		
			
			if(_args.crumb || _args.newPage){
				
				var keys = ['m'], vals = [module]
				
				if(_args.domTarget){
					keys.push('dt')
					vals.push(_args.domTarget)
				}
				
				if(_args.inject){
					keys.push('inj')
					vals.push(null)
				}
				
				if(_args.clearTarget || _args.newPage){
					keys.push('ct')
					vals.push(null)
				}
				
				parent.updateLocation(keys, vals, hash)
			}			
			
			if(!_args.domTarget){
                if(!_args.inject){
					document.body.appendChild(popup)			
				}else{
                    e.target.innerHTML = '';
                }				
			}else{
					
				try {
					_args.domTarget = document.getElementById(_args.domTarget)
				}
				catch(err) {
					console.log('Invalid Selector!')
					return
				}
				
				if(_args.clearTarget || _args.newPage){
					_args.domTarget.innerHTML = ''
				}
				
				if(!_args.inject){
					_args.domTarget.appendChild(popup)				
				}else{
                    popup.remove()
					_args.domTarget.innerHTML = ''
				}
				
				
			}	
	
			//PREPARE DATA	
			xhttp.onreadystatechange = function() {		
				if(this.status == 404 || this.status == 403){
					
					var te = {};
					if(this.status == 404){
						var tt = e.target.cloneNode(false)
						tt.setAttribute('module', 'error404')
						te.target = tt
					}
					
					console.log("Error: Can't Obtain Module Response - code("+this.status+")")
					this.abort()
					
					return parent.runAct('OpenModule', te)
				}		
				if (this.readyState == 4 && this.status == 200){     			
					complete(this.responseText)
				}
			}
            
            let method = "POST"
            let mString = "./modules/"+module+".php?uid="+ new Date().getTime()
            if(_args.forceGet){
                method = "GET"      
                xhttp.open(method, mString+'&'+new URLSearchParams(_postData).toString(), true)
                xhttp.send()
                return
            }else{
                xhttp.open(method, mString, true)
                xhttp.send(JSON.stringify(_postData))
            }       						
		}) 
		/*- end Open Module -*/
		
		/*- Validate Form & Next Section of Form -*/
		this.ACTS['FormNextSection'] = this.CreateAction('ValidateForm', (e,parent)=>{
			if(e.preventDefault){
				e.preventDefault()
			}			
			var t = e.target
			var maxSteps = parent.maxRecursionSteps || 12
			var s=t.parentNode
			var flag = false
	
			var elName = 'form-section'
			/*---- FORM SINGLE PAGE VALIDATE ----*/
			if(t.getAttribute('clickAct') == 'ValidateForm'){
				elName='form-group'
			}
	
			for(var i=0; i<maxSteps; i++){	 	
				if(s.classList.contains(elName)){
					flag = true
					break
				}else{
					s=s.parentNode
				}	
			}				
			
			if(!flag){
				return false
			}	
			//check for required parts
			
			var reqs = []
			
			reqs = s.querySelectorAll(':scope > [required],:scope > .required, * [required], * .required')
			//Check for embedded requirements
			for(var i=0; i<reqs.length; i++){				
				if (window.getComputedStyle(reqs[i]).display === "none") {
					reqs.splice(i,1)
					i--
				}
			}		
			
			console.log(reqs)
			let errors  = []
			let _in, el
			
			console.log('flag', flag)
			
			for(var i=0; i<=reqs.length; i++){
				
				if(!flag){
					errors.push(el)
					flag = true					
					el.classList.add('temp-flag')
				}	
				
				el = reqs[i]
				if(i==reqs.length){
					break		
				}
				el.classList.remove('temp-flag')
				//INPUTS
				
				if(el.classList.contains('input-basic') || (el.constructor.name == 'HTMLInputElement')){
					
					_in = el.querySelector('input') || el									
					
					if(el.querySelector('[type="checkbox"]') || el.getAttribute('type') == 'checkbox'){						
						_in = el.querySelector('[type="checkbox"]') || el
						console.log(el)						
						if((_in) && !_in.checked){
							flag = false
							console.log('Missing Checkbox!')
							continue
						}
					}
					
					if((!_in.value)){
						console.log(_in.value)
						flag = false
						continue
					}
					
					/*if((typeof _in.value === "undefined" || _in.value === null || _in.value === "") ||
						(el.classList.contains('processing')|| el.classList.contains('flagged-bad'))){
						flag = false			
					}*/
					
				}
		
				//DOMOGAMI INPUTS
				if(el.classList.contains('radio-link-group')){
					if(!el.querySelector('.selected')){
						flag = false		
					}	
				continue
				}		
			}
	
			if(errors.length){
				
				new DOMOGAMI.ERRORTIP({msg:'Check Required Values!'},parent)		
				
				setTimeout(()=>{
					errors.forEach((e)=>{
						e.classList.remove('temp-flag')
					})
				},3500)				
				return false
			}
			
			flag = false
	
			if(elName!='form-group'){
				s = s.parentNode
			}
	
			for(var i=0; i<maxSteps; i++){	 	
				if(s.classList.contains('form-group')){
					flag = true
					break
				}else{
					s=s.parentNode
				}	
			}
	
			if(!flag){
				return false
			}
			
			flag = false
	
			s=s.querySelectorAll(':scope > .form-section');	
	
			for(var i=0; i<s.length; i++){
				var _s = s[i]
				if(flag){
					_s.classList.add('active')
					break
				}
			
				if(_s.classList.contains('active')){
					_s.classList.remove('active')
					flag = true
				}
			}	
			
			this.runAct('CheckCallbackActs', e)	
		})		
		/*- end ValidateForm/FormNextSection Module -*/
		
		/*- Previous Section of Form -*/
		this.CreateAction('FormPreviousSection', (e,parent)=>{
			if(e.preventDefault){
				e.preventDefault()
			}	
			var t = e.target;
			var maxSteps = 12;
			var s=t.parentNode;
			var flag = false;
			
			for(var i=0; i<maxSteps; i++){	 	
				if(s.classList.contains('form-section')){
				flag = true;
				break;
				}else{
				s=s.parentNode;
				}	
			}	
			if(!flag){return false;}
			flag = false;
			
			s = s.parentNode;
			
			for(var i=0; i<maxSteps; i++){	 	
				if(s.classList.contains('form-group')){
				flag = true;
				break;
				}else{
				s=s.parentNode;
				}	
			}
			
			if(!flag){return false;}
			
			flag = false;
			
			s=s.querySelectorAll(':scope > .form-section');				
			
			for(var i=s.length-1; i>=0; i--){
				var _s = s[i];
				if(flag){
				_s.classList.add('active');
				break;
				}
				
				if(_s.classList.contains('active')){
				_s.classList.remove('active');
				flag = true;
				}
			}				
			this.runAct('CheckCallbackActs', e)			
		})		
		/*- end FormBackSection Module -*/
		
		/*- FormGotoSection -*/
		this.CreateAction('FormGotoSection', (e,parent)=>{
			if(e.preventDefault){
				e.preventDefault()
			}	
			console.log('FormGotoSection', e)
			var t = e.target
			var maxSteps = parent.maxRecursionSteps || 12
			var s=t.parentNode
			
			var flag = false
			
			for(var i=0; i<maxSteps; i++){	 	
				if(s.classList.contains('form-section')){
					flag = true
					break
				}else{
					s=s.parentNode
				}	
			}
			
			if(!flag){return false}
			flag = false	
			
			s = s.parentNode
			
			for(var i=0; i<maxSteps; i++){	 	
				if(s.classList.contains('form-group')){
					flag = true
					break
				}else{
					s=s.parentNode
				}	
			}
			
			if(!flag){return false}
			
			flag = false
			
			var active = s.querySelector('.form-section.active')
			active.classList.remove('active')
			
			var s = s.querySelector('[id="'+t.getAttribute('targetSection')+'"]')
			console.log(s);
			
			s.classList.add('active')
			
			this.runAct('CheckCallbackActs', e)				
		})		
		/*- end FormGotoSection Module -*/		
		
		
		this.CreateAction('CheckCallbackActs', (e,parent)=>{
			let t = e.target
			if(t){
				let act = t.getAttribute('callbackAct')
				if(act && parent.ACTS[act]){
						parent.ACTS[act].callback(e, parent)
				}
			}
			
			let loadActs = document.body.querySelectorAll('[loadAct]')
			console.log(loadActs, 'loadActs')
	
			for(let i=0; i<loadActs.length; i++){
				var cb = loadActs[i].getAttribute('loadAct')
				loadActs[i].removeAttribute('loadAct')				
				
				if(cb && parent.ACTS[cb]){
					console.log('FIRING LOADACT')
  					parent.ACTS[cb].callback({target:loadActs[i]}, parent)
				}else{					
					let lpC = 0
					let loadPromise
					function stopPromise(){
						window.clearInterval(loadPromise)
					}
					function doPromise(){
						parent.ACTS[cb].callback({target:loadActs[i]}, parent)
					}
					loadPromise = setInterval(()=>{
						if(cb && parent.ACTS[cb]){
							stopPromise()
							doPromise()
						}else{
							lpC++
							if(lPc>6){
								stopPromise()
							}
						}					
					}, 1000)					
				}
			}
 			
		})
		/*- end CheckCallbacks  -*/			
		
		this.CreateAction('SelectCustomRadioLink', (e,parent)=>{
			e.preventDefault();
			let t = e.target;
			let p = t.parentNode;
			let o = p.querySelector('.selected')
			if(o){o.classList.remove('selected')}
			t.classList.add('selected')

			this.runAct('CheckCallbackActs', e)				
		})
		/*- end SelectCustomRadioLink  -*/

		this.CreateAction('UnlockFormToEdit', (e,parent)=>{
			let t = e.target
			let root
			
			if(!t.getAttribute('formTarget')){			
				let maxSteps = 12
				let s=t.parentNode
				let flag = false
		
				for(var i=0; i<maxSteps; i++){	 	
					if(s.classList.contains('form-group')){
						flag = true
						break
					}else{
						s=s.parentNode
					}	
				}	
				
				if(!flag){return false}
				flag = false
				root = s			
			}else{				
				root = document.getElementById(t.getAttribute('formTarget'))				
			}
			
			if(!root){return false}	

		
			if(!root.getAttribute('id')){
				root.setAttribute('id', Date.now())
			}
				
			let id = root.getAttribute('id')		
			
			if(parent.formBank[id]){
				new DOMOGAMI.ERRORTIP({msg:"Please Close Active Form"}, parent)
				return
			}		
		
			parent.formBank = new DOMOGAMI.FORMHISTORY(root, parent)
		
			//Bindings for Inputs
			root.addEventListener('focus', parent.formBank.Add, true)	

			var disabled = root.querySelectorAll('.disabled')

			for(var i=0; i<disabled.length; i++){
				disabled[i].classList.remove('disabled')	
			}
		
		})
		/*- end UnlockFormToEdit -*/	

		this.CreateAction('UndoAndLockForm', (e,parent)=>{
			let t = e.target
			let root
			
			if(!t.getAttribute('formTarget')){			
				let maxSteps = 12
				let s=t.parentNode
				let flag = false
		
				for(var i=0; i<maxSteps; i++){	 	
					if(s.classList.contains('form-group')){
						flag = true
						break
					}else{
						s=s.parentNode
					}	
				}	
				
				if(!flag){return false}
				flag = false
				root = s			
			}else{				
				root = document.getElementById(t.getAttribute('formTarget'))				
			}
			
			if(!root){return false}	

		
			if(!root.getAttribute('id')){
				root.setAttribute('id', Date.now())
			}
				
			let id = root.getAttribute('id')		
			
			if(!parent.formBank[id]){
				new DOMOGAMI.ERRORTIP({msg:"No Form Record!"}, parent)
				return
			}		
		
			let formBankRecord = parent.formBank[id]
			
			//Remove Bindings for Inputs
			
			if(t.getAttribute('lock')){	
				root.removeEventListener('focus', formBankRecord.Add, true)			
				let disable = root.querySelectorAll('.input-basic')
				for(var i=0; i<disable.length; i++){
					disable[i].classList.add('disabled')
				}
			}
			
			if(t.getAttribute('undo')){	
				formBankRecord.Revert()
			}
			
			if(t.getAttribute('lock')){	
				formBankRecord.Dispose()
				formBankRecord = ''	
			}		
		})
		/*- end UndoAndRelockForm -*/
		
		this.CreateAction('RemoveParent', (e,parent)=>{
			var p = e.target.parentNode;
			var t = parseInt(e.target.getAttribute('step'), 10) || 1
	
			for(var i=0; i<t; i++){
				p = p.parentNode
			}
			
			p.remove()
		})
		/*- end RemoveParent -*/
		
			
		

	
	}
	
	/***********************
	*	_bindings => Private Method
	*	args : Object
	*	description: Private method used by used by the constructor.  Creates Default Event Bindings.
	************************/
	_bindings(args){
		var self = this
		
		let ael
		if(args.events){
			ael = args.events.length || 0;
		}else{
			ael = 0;
		}
		
		for(let i=0; i<ael; i++){
			let et = args.events[i]
			//handle onPopStates
			if(et == 'popstate' ||
			   et == 'pageshow'
			){
				window.addEventListener(et, function(e){
					//e.preventDefault()
					self.ACTS['CheckBreadcrumbs'].callback(e, self)
				},false)
				continue
			}
			
			document.body.addEventListener(et, function(e){
  				let t = e.target
				if(!t){
					//targetless act!
					console.log(e)
					console.log("Targetless Act Please Program a Response!")
				}else{
  				let act = t.getAttribute(et+'Act')	
					console.log(act);
				
					if(act && self.ACTS[act]){
						self.ACTS[act].callback(e, self)
					}
				}
				return
  			}, false)
		}	
	}
	
	/***********************
	*	parseAttrArray => Public Method
	*	attr : String
	*	valuesplit :  String
	*	itemsplit :  String
	*	description: Breaks down attribute strings into Objects
	************************/	
	parseAttrArray(attr, valuesplit = ':', itemsplit = ';'){
		attr = attr.split(itemsplit);
		var _args = {};
		for(var i=0; i<attr.length; i++){
			var a = attr[i].split(valuesplit)
			if(a!=''){
			if(a.length>1){
			_args[a[0]] = a[1]
			}else{
			_args[a[0]] = true
			}
			}		
		}
		return _args;
	}
	
	/***********************
	*	getValue => Public Method
	*	t : element
	*	attr : String
	*	forceTarget :  String
	*	grabContents :  String
	*	description: Get the Value of elements on the page.  Flag for grabbing the html content of the element, or an attribute; forceTarget flag causes the method to target the passed element directly.  If left false the method will parse the element like its an element group.
	************************/		
	getValue(t, attr = 'value', forceTarget = false, grabContents = false){
		t = document.getElementById(t) || t
		if(!t){return}		
		if(forceTarget){
			return grabContents?t.innerHTML:t.getAttribute(attr)
		}
			if(
				t.tagName == 'DIV' ||
				t.tagName == 'SPAN' ||
				t.tagName == 'A'
			){
				if(t.classList.contains('radio-link-group')){
					if(!t.querySelector('.selected')){return null}
					return grabContents?t.querySelector('.selected').innerHTML:t.querySelector('.selected').getAttribute(attr)
				}
				
				return grabContents?t.innerHTML:t.getAttribute(attr)
			}
			
			if(t.tagName == 'INPUT'){
				
				if(t.type == 'checkbox'){
					if(t.checked){return true}else{return false}
				}
				
				return t.value
			}
	}
		
	/***********************
	*	createEventElement => Public Method
	*	parameters : Object
	*	type : String
	*	description: Creates an Element with the correct attributes.
	************************/	
	createEventElement(parameters = {}, type = 'div'){	
		var el = document.createElement(type)		
		for(var key in parameters){
			el.setAttribute(key, parameters[key]);           
		}
		return {target:el};
	}
	
	/***********************
	*	checkLocation => Public Method
	*	description: Checks the location and returns the parameters in the url as an Object
	************************/	
	checkLocation(){		
		
		var ss = String(window.location.search) || ''
		if(ss.length){
			ss = ss.replace('?', '')
			ss = ss.split(';')	
		}		
		return ss
	}
	
	
	/***********************
	*	updateLocation => Public Method
	*	key : Parameter Key Name
	*	value:Value of the Parameter
	*	description: Pushes the history state to the DOM
	************************/	
	updateLocation(keys, values, hash){
		
		var ss = '';
		if(keys.length){		
			ss = '?'
			for(let i=0; i<keys.length; i++){
				ss += keys[i]
				if(values[i]===null){
					ss+=';'
					continue
				}
				ss+='='+values[i]+';'
			}
			ss = ss.substr(0, ss.length-1)
			if(hash){
				ss += '#'+hash
			}			
		}
		
		history.pushState(null, null, ss)		
	}
	
	/***********************
	*	runAct => Public Method
	*	act : String
	*	e : Event
	*	description: Method for running ACTS by name from within the DOMOGAMI Object Scope. Usually used with an already transpired Event.
	************************/
	runAct(act, e){
		if(this.ACTS[act]){
			return this.ACTS[act].callback(e, this)
		}
	}
	
	/***********************
	*	getData => Public Method
	*	processName : string
	*	callback : function(*response:json|string)
	*	postData : Object
	*	json : Boolean
	*	fromRoot : Changes the location of the process folder it is looking for to the __FILE__ dir for the root folder, if false it is local to the Calling __FILE__ location.
	*	description: Expects the name of a PHP script located in './process/', no suffixes are needed.  The Callback expects a response parameter when declaring it.  The postData can by any Object (I have not tested nested Objects and I doubt they work... will fix eventually.)? Json is a flag for auto-parsing the response as a JSON file. <BR><BR>   The return will be what ever the callbacks return value is.  This can be used to just POST data as well.
	************************/
	getData(processName, callback, postData = {}, json=true, fromRoot = true, forceGet = false){
		console.log('getData', processName)
        console.log('Getting Data From Root:'+ fromRoot.toString())
		
		let xhttp = new XMLHttpRequest()
		
		function complete(response){
			if(json){
				response = JSON.parse(response)
			}		
			if(callback){
				return callback(response)
			}
		}
	
		xhttp.onreadystatechange = function() {		
			if(this.status == 404 || this.status == 403){
				console.log("Error: Can't Obtain Data Response - code("+this.status+")")
				this.abort()
				return false
			}			
			if (this.readyState == 4 && this.status == 200){     			
     			complete(this.responseText)
			}		
		}

		let pString = '';
		if(fromRoot === true){
			let pn = window.location.pathname.split('/')
			pn.forEach((sub)=>{
				if(sub!=""){
					pString+='../';
				}
			})
		}
        
        let method = "POST"
        pString+="process/"+processName+".php?uid="+ new Date().getTime()
        console.log("pString => " + pString);        
        if(forceGet){
            method = "GET"      
            xhttp.open(method, pString+'&'+new URLSearchParams(postData).toString(), true)
            xhttp.send()
            return
        }else{
            xhttp.open(method, pString, true)
            xhttp.send(JSON.stringify(postData))
        }
	}
    
    /***********************
	*	getModule => Public Method
	*	moduleName : string
	*	callback : function(*response:json|string)
	*	postData : Object
	*	fromRoot : Changes the location of the process folder it is looking for to the __FILE__ dir for the root folder, if false it is local to the Calling __FILE__ location.
	*	description: Expects the name of a PHP script located in './process/', no suffixes are needed.  The Callback expects a response parameter when declaring it.  The postData can by any Object (I have not tested nested Objects and I doubt they work... will fix eventually.)? Json is a flag for auto-parsing the response as a JSON file. <BR><BR>   The return will be what ever the callbacks return value is.  This can be used to just POST data as well.
	************************/
	getModule(moduleName, callback, postData = {}, fromRoot = true){
		console.log('getData', moduleName)
		
		let xhttp = new XMLHttpRequest()
		
		function complete(response){
			if(callback){
				return callback(response)
			}
		}
	
		xhttp.onreadystatechange = function() {		
			if(this.status == 404 || this.status == 403){
				console.log("Error: Can't Obtain Data Response - code("+this.status+")")
				this.abort()
				return false
			}			
			if (this.readyState == 4 && this.status == 200){     			
     			complete(this.responseText)
			}		
		}

		let pString = '';
		if(fromRoot){
			let pn = window.location.pathname.split('/')
			pn.forEach((sub)=>{
				if(sub!=""){
					pString+='../';
				}
			})
		}

		pString+="modules/"+moduleName+".php";
		console.log("pString => " + pString);

		xhttp.open("POST", pString, true);
		xhttp.send(JSON.stringify(postData));
	}
	
	/***********************
	*	CreateAction => Object
	*	name : string
	*	callback : function(e:Event, parent: OBJECT)
	*	return : Object => DOMOGAMI.ACT
	*	description: Create ACT Object and bind it to the ACTS scope of the DOMOGAMI Object.
	************************/
	CreateAction(name, callback){		
		this.ACTS[name] = new DOMOGAMI.ACT(name, callback, this)
		return this.ACTS[name]
	}
	
	
	/***********************
	*	screenlock => none
	*	toggle : Boolean
	*	description: Creates or Destroys the  default screenlock!  Later implementation will have this tied to a IO so that it can never be removed by the client unless they completely stop the system... which would render doing that useless.
	************************/	
	screenlock(toggle){		
		function checklock(){
			var sl = document.querySelector('.screenlock')
			return sl
		}
		
		function createlock(){
			lock = document.createElement('div')
			lock.classList.add('screenlock')
			document.body.appendChild(lock)
		}		
				
		var lock = checklock()
		if(toggle){
			if(!lock){
				createlock()
			}			
			this.screenlocked = true		
		}else{
			this.screenlocked = false			
			if(lock){lock.remove()}  	
		}  
	}
	
		
	/***********************
	*
	*	SETTERS/GETTERS
	*
	************************/
	
	set debug(v){this._debug = v}
	get debug(){return this._debug}
	
	get startedOn(){return this._startedOn}
	
	get defaultPopupText(){return this._defaultPopupText}
	set defaultPopupText(v){this._defaultPopupText = v}
	
	get screenlocked(){return this._screenlocked}
	set screenlocked(v){this._screenlocked = v}
	
	get ignoreBreadcrumbs(){return this._ignoreBreadcrumbs}
	set ignoreBreadcrumbs(v){this._ignoreBreadcrumbs = v}
	
	get callbackFailsafe(){return this._callbackFailsafe}
	set callbackFailsafe(v){this._callbackFailsafe = v}
	
	get activeWebGLScene(){return this._activeWebGLScene}
	set activeWebGLScene(v){this._activeWebGLScene = v}
	
	get formBank(){return this._formBank}
	
	get ACTS(){return this._ACTS}
}

/***********************
*	DOMOGAMI.ACT => Object
*	name : string
*	callback : function(e:Event, parent: OBJECT)
*	parent : Object
*	return : Object => DOMOGAMI.ACT
*	description: This is the Object Class for the ActionEvent System.
************************/
DOMOGAMI.ACT = class{
	constructor(name, callback, parent){
		this._name = name
		this._callback = callback
		this._parent = parent
	}

	get name(){return this._name}
	get callback(){return this._callback}
	get parent(){return this._parent}
}


DOMOGAMI.ERRORTIP =  class{
	constructor(args = {msg:'There is an ERROR!'}, parent){
		
		if(!args.domTarget){
			var stack = document.querySelector('.error-stack')
			if(!stack){
				stack = document.createElement('div')
				stack.classList.add('error-stack')
				document.body.appendChild(stack)
			}
		}
		
		var block = document.createElement('div')	
			block.classList.add('error-item')
			block.innerHTML = args.msg
		
			stack.appendChild(block)
	
	
	function stop(){
		block.remove()
		if(!stack.querySelector('.error-item')){
			stack.remove()
		}
	}
	
	setTimeout(function(){
		stop()
	}, 3200)
		
	}
}


DOMOGAMI.FORMHISTORY = class{
	constructor(form, parent){
		this._form = form
		this._parent = parent
		this._uID = Date.now()
		this.hiddenForm = document.createElement('div')
		this.hiddenForm.style.display = 'none'
		this.hiddenForm.setAttribute('id', 'hidden-input-form-'+this.uID)
		this.hiddenForm.setAttribute('tID', this.form.getAttribute('id'))
		document.body.appendChild(this.hiddenForm)		
	}
	
	//NEED TO ADD MORE TYPES
	Add(e){
		var t = e.target
			if(t.type == "text"){
				var hiddenForm = document.getElementById('hidden-input-form-'+this.uID)
	
			if(hiddenForm.querySelector("[id='"+t.getAttribute('id')+"']")){
				return
			}
			
			(hiddenForm).appendChild(t.cloneNode(false))
		}	
	}
	
	Revert(){
		var hf = document.getElementById('hidden-input-form-'+this.uID)
		var f = document.getElementById(hf.getAttribute('tID'))
	
		var inputs = hf.querySelectorAll('input')
		for(var i=0; i<inputs.length; i++){
			(f.querySelector("[id='"+inputs[i].getAttribute('id')+"']")).value = inputs[i].value		
		}		
	}

	Dispose(){
		document.getElementById('hidden-input-form-'+this.uID).remove()
	}
	
	get parent(){return this.parent}
	
	get uID(){return this._uID}
	
	get form(){return this._form}
	set form(v){this._form = v}
	
	get hiddenForm(){return this._hiddenForm}
	set hiddenForm(v){this._hiddenForm = v}
}





