/*
---

name: ValidateSimple
script: ValidateSimple.js
description: Simple form validation with good UX

requires:
  - Core/Class.Extras
  - Core/Element.Event
  - More/Events.Pseudos
  - More/Element.Event.Pseudos
  - More/Class.Binds

provides: [ValidateSimple]

authors:
  - Ian Collins

...
*/

var ValidateSimple = new Class({
  
  Implements: [Events, Options],
  
  Binds: ['checkValid', 'onSubmit'],
  
  options: {
    active: true,
    validateOnSubmit: true,
    initialValidation: true,
    alertUnedited: true,
    inputSelector: 'input',
    invalidClass: 'invalid',
    validClass: 'valid',
    optionalClass: 'optional',
    attributeForType: 'class',
    alertEvent: 'blur',
    correctionEvent: 'keyup:filterInvalidKeys',
    validateEvent: 'keyup:filterInvalidKeys',
    checkPeriodical: 1000,
    noValidateKeys: ['left','right','up','down','esc','tab','command','option','shift','control']
  },
  
  state: 'untouched',
  
  initialize: function(element, options){
    this.setOptions(options);
    
    this.element = document.id(element).addClass('untouched');
    this.parentForm = this.element.get('tag') == 'form' ? this.element : this.element.getParent('form');
    this.inputs  = this.options.inputs || this.element.getElements(this.options.inputSelector);
    
    this.inputs = this.inputs.filter(function(input){
      return !input.hasClass(this.options.optionalClass); // todo or hidden or disabled
    }, this);

    Event.definePseudo('filterInvalidKeys', function(split, fn, args){
      if (!this.options.noValidateKeys.contains(args[0].key))
        fn.apply(this, args);
    }.bind(this));
    
    if (this.options.active) this.activate();      
    if (this.options.initialValidation) this.validateAllInputs();
    
    return this;
  },
  
  attach: function(){
    if (!this.active){
      this.active = true;
      
      $(document.body).addEvent('keydown', function(e){
        if (e.key !== 'tab' && this.options.noValidateKeys.contains(e.key))
          this.active = false;          
      }.bind(this));
      $(document.body).addEvent('keyup', function(e){
        if (e.key !== 'tab' && this.options.noValidateKeys.contains(e.key))
          (function(){ this.active = true; }).delay(100, this);
      }.bind(this));
      
      this.inputs.each(function(input){
        input.addEvent(this.options.validateEvent, function(e){
          if (e.key !== 'tab') input.store('validate-simple-touched', true);
          if (this.element.hasClass('untouched'))
            this.changeState('touched');
        }.bind(this));
        var callbacks = [this.validateInput.pass(input, this), this.alertInputValidity.pass(input, this)];
        input.addEvent(this.options.validateEvent, callbacks[0]);
        input.addEvent('change', callbacks[0]);
        input.addEvent(this.options.alertEvent, callbacks[1]);
        input.store('vs-previous-value', input.get('value'));        
        input.store('validate-simple-callbacks', callbacks);
        input.store('validate-simple-instance', this);
      }, this);
      
      if (this.options.validateOnSubmit)
        this.parentForm.addEvent('submit', this.onSubmit);
      
      if (this.options.checkPeriodical)
        this.checkForChangedInputsPeriodical = this.checkForChangedInputs.periodical(this.options.checkPeriodical, this);
    }
    
    return this;
  },
  detach: function(){
    this.active = false;
    this.inputs.each(function(input){          
      var callbacks = input.retrieve('validate-simple-callbacks');
      if (callbacks){
        input.removeEvent(this.options.validateEvent, callbacks[0]);
        input.removeEvent('change', callbacks[0]);
        input.removeEvent(this.options.alertEvent, callbacks[1]);
        if (callbacks[2])
          input.removeEvent(this.options.correctionEvent, callbacks[2]);
      }
      input.store('validate-simple-watching', false);
    }, this);
    
    if (this.options.validateOnSubmit)
      this.parentForm.removeEvent('submit', this.onSubmit);
        
    clearInterval(this.checkForChangedInputsPeriodical);
    return this;
  },
  
  onSubmit: function(e){
    if (!this.validateAllInputs()){
      if (e) e.preventDefault();
      this.fireEvent('invalidSubmit', [this, e]);
      this.alertAllInputs();
    } else
      this.fireEvent('validSubmit', [this, e]);
  },
  
  activate: function(){ this.attach(); },
  deactivate: function(){ this.detach(); },  
  
  validateInput: function(input){
    if (!this.active) return this;
    var validatorTypes = input.get(this.options.attributeForType),
        validators = [];
    
    if (this.options.attributeForType == 'class'){
      var mtch = validatorTypes.match(/validate\-[\w-]+/g);
      validatorTypes = (mtch && mtch.length > 0) ? mtch : ['text'];
    }
    validatorTypes = $A(validatorTypes);
    
    input.store('validate-simple-is-valid', true);

    validatorTypes.each(function(validatorType){
      var validatorType = validatorType.replace('validate-',''),
          validator = ValidateSimple.Validators[validatorType],
          testResult = validator.test(input);
      
      if (!testResult)
        this.invalidateInput(input, validatorType);
      else if (validator.postMatch)
        validator.postMatch(testResult, input);
        
    }, this);
    
    if (input.retrieve('validate-simple-is-valid'))
      this.alertInputValidity(input);

    this.checkValid();
    return this;
  },
  validateAllInputs: function(){
    this.inputs.each(function(input){
      this.validateInput(input);
    }, this);
    return this.state == 'valid';
  },
  
  invalidateInput: function(input, validatorType){
    var errors = input.retrieve('validate-simple-errors') || [];
    input.store('validate-simple-is-valid', false);
    input.store('validate-simple-errors', errors.include(validatorType));
    this.changeState('invalid');
    return this;
  },
  
  alertInputValidity: function(input){
    if (!this.active) return this;
    var inputValid = input.retrieve('validate-simple-is-valid'),
        isEdited = this.options.alertUnedited ? true : input.retrieve('validate-simple-touched');

    if (this.state != 'untouched' && isEdited){
      if (inputValid){
        input.addClass(this.options.validClass).removeClass(this.options.invalidClass);
        this.fireEvent('inputValid', [input, this]);
      } else {
        input.addClass(this.options.invalidClass).removeClass(this.options.validClass);
        this.fireEvent('inputInvalid', [input, input.retrieve('validate-simple-errors'), this]);
      }
      
      if (!input.retrieve('validate-simple-watching')){
        var callback = this.alertInputValidity.pass(input, this);
        input.addEvent(this.options.correctionEvent, callback);
        input.store('validate-simple-watching', true);
        var callbacks = input.retrieve('validate-simple-callbacks');
        input.store('validate-simple-callbacks', callbacks.include(callback));
      }
    }
    return this;
  },
  alertAllInputs: function(){
    this.options.alertUnedited = true;
    this.inputs.each(function(input){
      this.alertInputValidity(input);
    }, this);
    return this;
  },
  
  checkForChangedInputs: function(){
    this.inputs.each(function(input){
      var previous = input.retrieve('vs-previous-value'),
          current = input.get('value');

      if (previous != current){
        if (this.element.hasClass('untouched'))
          this.changeState('touched');
        this.validateInput(input);
      }
      
      input.store('vs-previous-value', current);
    }, this);
    return this;
  },

  checkValid: function(){
    var allInputsValidOrOptional = this.inputs.every(function(input){
      return input.retrieve('validate-simple-is-valid') || input.hasClass(this.options.optionalClass);
    }, this);
    
    this.changeState(allInputsValidOrOptional ? 'valid' : 'invalid');
    return this;
  },
  
  changeState: function(state){
    this.state = state;
    this.element.addClass(state);
    if (state == 'valid') this.element.removeClass('invalid');
    else if (state == 'invalid') this.element.removeClass('valid');    
    else if (state == 'touched') this.element.removeClass('untouched');
    this.fireEvent(state, this);
    return this;
  }
  
});


ValidateSimple.Validators = {
  'email': {
    test: function(input){
      return input.get('value').test(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i);
    }
  },
  'text': {
    test: function(input){
      return ((input.get('value') != null) && (input.get('value').length > 0));       
    }
  },
  'name': {
    test: function(input){
      return input.get('value').test(/^[A-Za-z -'&]+$/);
    }
  },
  'url': {
    test: function(input){
      return input.get('value').test(/^(https?|ftp|rmtp|mms):\/\/(([A-Z0-9][A-Z0-9_-]*)(\.[A-Z0-9][A-Z0-9_-]*)+)(:(\d+))?\/?/i);
    }
  },
  'alpha': {
    test: function(input){
      return input.get('value').test(/^[a-zA-Z]+$/);
    }
  },
  'alphanumeric': {
    test: function(input){
      var value = input.get('value');
      return value.length > 0 & !value.test(/\W/);
    }
  },
  'numeric': {
    test: function(input){
      return input.get('value').test(/^-?(?:0$0(?=\d*\.)|[1-9]|0)\d*(\.\d+)?$/);
    }
  },
  'zipcode': {
    test: function(input){
      return input.get('value').test(/^\d{5}(-?\d{4})?$/);
    }
  },
  'state': {
    test: function(input){
      var states = ['AL','AK','AS','AZ','AR','AE','AA','AE','AP','CA','CO','CT','DE','DC','FM','FL','GA','GU','HI','ID','IL','IN','IA','KS','KY','LA','ME','MH','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','MP','OH','OK','OR','PW','PA','PR','RI','SC','SD','TN','TX','UT','VT','VI','VA','WA','WV','WI','WY'];
      return states.contains(input.get('value').clean().toUpperCase());
    }
  }
};

Event.Keys['command'] = 91;
Event.Keys['option'] = 18;
Event.Keys['shift'] = 16;
Event.Keys['control'] = 17;