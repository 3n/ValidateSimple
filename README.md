ValidateSimple
==============

A MooTools class for realtime, client-side validation of form inputs. Given a form it will
fire events as inputs become valid/invalid as the user is typing. It will also, of course,
alert you when the entire form is valid. 

For now, specifying which inputs are validated and via what criteria are done through class
names. This could probably switch over to data attributes at some point, but I don't want to
do all that browser testing (help?).

Validators themselves are configurable, and a small set of them is provided to get you 
started (in the ValidateSimple.Validators object).

_Note: this is not a drop-in "plugin" that will do everything for you. This code does not
enforce and kind of UI whatsoever, it just fires events and lets you handle what is 
displayed. If you want a more powerful, hands-off validator use the standard MooTools More
one. I created this to be more light-weight and have greater flexibility in when forms are 
validated._

![Screenshot](http://idisk.me.com/iancollins/Public/Pictures/Skitch/BankSimple_%7C_Home-20101201-135604.png)



How to use
----------

In your HTML, add classnames of the form "validate-TYPE" where TYPE is something like "email".
	
	<input name="email" type="email" title="A valid email, please" class="validate-email">
	
In your Moo code, do something like:

	new ValidateSimple(form_element, {
		inputs: 'form input[type=text], form input[type=email]',
		onValid: function(){
			// do something like activate the submit button
		},
		onInvalid: function(){
			// do something like deactivate the submit button
		},
		onInputInvalid: function(input, errors){
			// do something like show an error message somewhere, possibly based off the input's title attr
			// errors (2nd arg) will contain an array of strings - each string is the validation type that
			// failed. Example: ['email', 'no-troll']
		}
	});
	
Here's what happens next:

1. The user starts typing into one of the inputs.
2. The user tabs/clicks out of the input (possibly to another).
3. The user made a mistake, and onInputInvalid is fired. A class "invalid" is automatically 
	 added to the input as well.
4. The user clicks back to the input to make a mistake.
5. Now, as they type, each keyup will check the input and remove the "invalid" class as soon
   as it is correct. The onInputInvalid and onInputValid events will also fire for each keyup.
6. Once all inputs are valid (meaning they don't have the "invalid" class), the 
   onValid event fires.

What this means is that the first time a user fills out a given input, it will
wait until they are finished to alert them. But, once they go back to an input
alerting (of valid _or_ invalid) will happen as they type. The entire form's 
validity is always based on each keyup.


Custom Validators
-----------------

Let's say you did this in your html

	<input name="email" type="email" class="validate-email validate-no-troll">
	
You could create this validator anywhere in your Javascript:

	ValidateSimple.Validators['no-troll'] = {
	  test: function(input){
	    return !input.get('value').test(/<\s*script/i) && !input.get('value').test(/drop\s+table/i);
	  }
	};
	
Now in your onInputInvalid callback, you can check for "no-troll" in the errors
array, and do something to the troll you caught. ;7


ValidateSimple Method: constructor
----------------------------------

	var vs = new ValidateSimple(form[, options]);

#### Options

  * active - (boolean: defaults to true) Doesn't attach events until activated.
  * validateOnSubmit - (boolean: defaults to true) validate all inputs on submit and fire events (see below).
  * inputSelector - (mixed: defaults to 'input') CSS Selector or input elements.
  * invalidClass - (string: defaults to 'invalid') class to add for invalid inputs.
  * validClass - (string: defaults to 'valid') class to add for valid inputs.
  * optionalClass - (string: defaults to 'optional') elements with this class are ignored.
  * attributeForType - (string: defaults to 'class') attribute that holds validate-xxx stuff.
  * alertEvent - (string: defaults to 'blur') event name for initial alert of input validity.
  * correctionEvent - (string: defaults to 'keyup') event name for subsequent alerts of input validity.
  * validateEvent - (string: defaults to 'keyup') event name for input validation.
  * checkPeriodical - (number: defaults to 1000) how often to check for changed inputs. This comes
    in handy when the user uses and automated form filler like 1Password, which does not fire any
    events.


#### Events

  * inputValid - When an input becomes valid. Arguments: input element and this.
  * inputInvalid - When an input becomes invalid. Arguments: input element, errors array and this.
  * touched - When form has been edited.
  * valid - When form is valid.
  * invalid - When form is invalid.
  * invalidSubmit - (Only when validateOnSubmit is true) When form is submitted and invalid.
    Arguments: this instance and the submit event.
  * validSubmit - (Only when validateOnSubmit is true) When form is submitted and valid.
    Arguments: this instance and the submit event.


ValidateSimple Method: activate
-------------------------------

Activates the instance of ValidateSimple (attaches events and sill start firing events).

#### Syntax

	vs.activate();
	

ValidateSimple Method: deactivate
---------------------------------

Deactivates the instance of ValidateSimple (detaches events and sill start firing events).

#### Syntax

	vs.deactivate();
	
	
ValidateSimple Method: validateAllInputs
---------------------------------

Validates all inputs and returns true for a valid form, false for an invalid form.

#### Syntax

	vs.validateAllInputs();
	
