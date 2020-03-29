function sendRequest(method, url, callback) {
	let request = new XMLHttpRequest();
	request.open(method, url);
	request.onload = () => callback(request.response);
	request.send();
}
		
function getDogsList(callback) {
	sendRequest(
		"GET",
		"https://dog.ceo/api/breeds/list/all",
		(response) => {
			let dogListObject = JSON.parse(response);
			let dogList = [];
			
			for(let dog in dogListObject.message)
				dogList.push({
					name : dog,
					subDogs : dogListObject.message[dog]
				});
			
			callback(dogList);
		}
	);
}

let dogListComponent;

let dogCustomListComponent;
let dogCustomListOptionComponent;

let allDogListStaticSelectVM;

let allDogListSelectVM;
let selectedDogListVM;

let customAllDogListSelectVM;
let customSelectedDogListVM;

function initComponents() {
	dogListComponent = Vue.component('dog-list', {
		props : {
			"list-title" : {
				type : String,
				default : "DEFAULT LIST TITLE"
			},
			"option-class" : {
				type : String
			},
		},
		methods : { 
			dogs : function() {
				return this._context.$data.dogData.dogs;
			},
			dogListSelectionChangeHandler : function() {
				if(this.$root.selectedListVM == null || this.$root.selectedListVM == undefined)
					return;
				
				let dogs = [...this.$el.options].filter(option => option.selected)
												.map(option => option.value);
				let error = dogs.length == 0 || (dogs.length == 1 && dogs[0] == "null");
				
				Object.assign(this.$root.selectedListVM.dogData, { dogs : dogs });
				Object.assign(this.$root.selectedListVM.classObject, {
					active : !error,
					error : error
				});
			}
		},
		template : `<select v-on:change="dogListSelectionChangeHandler()" size="40" multiple>
						<option value="null">{{ listTitle }}</option>
						<option v-for="dog in dogs()" value="{{ dog }}" v-bind:class="optionClass">{{ dog }}</option>
				    </select>`
	});
	
	dogCustomListOptionComponent = Vue.component('custom-dog-option', {
		props : {
			dog : {
				type : String
			},
			selected : {
				type : Boolean,
				default : false
			}
		},
		data : function() {
			return {
				optionClass : {
					"custom-list-option-selected" : false,
					"custom-list-option" : true
				}
			};
		},
		methods : { 
			selectHandler : function(e) {
				if((e.buttons != 0 || e.type == "click")) {
					this.selected = e.ctrlKey;
					
					Object.assign(this.optionClass, {
						"custom-list-option-selected" : this.selected,
						"custom-list-option" : !this.selected
					});
					
					this.$emit("selected-changed");
				}
			}
		},
		template : `<div v-bind:class="optionClass" v-on:mouseover.native="selectHandler($event)" v-on:click.native="selectHandler($event)">{{ dog }}</div>`
	});
		
	dogCustomListComponent = Vue.component('custom-dog-list', {
		props : {
			"list-title" : {
				type : String,
				default : "DEFAULT LIST TITLE"
			}
		},
		methods : { 
			dogs : function() {
				return this._context.$data.dogData.dogs;
			},
			dogListSelectionChangeHandler : function() {
				if(this.$root.selectedListVM == null || this.$root.selectedListVM == undefined)
					return;
				
				let dogs = Array.from(this.$el.children).slice(1)
														.map(optionWrapper => optionWrapper.children[0])
														.filter(option => option.__vue__.selected)
														.map(option => option.__vue__.dog);
				let error = dogs.length == 0 || (dogs.length == 1 && dogs[0] == "null");
				
				Object.assign(this.$root.selectedListVM.dogData, { dogs : dogs });
				Object.assign(this.$root.selectedListVM.classObject, {
					active : !error,
					error : error
				});
			}
		},
		template : `<div>
						<div>{{ listTitle }}</div>
						<div v-for="dog in dogs()">
							<custom-dog-option v-on:selected-changed="dogListSelectionChangeHandler()" v-bind:dog="dog"></custom-dog-option>
						</div>
					</div>`
	});
}
	
function initDataBinding() {
	initComponents();
	
	getDogsList(topDogsList => {
		
		let allDogsList = Array.from(new Set(topDogsList.reduce((acc, dog) => {
			acc.push(dog.name);
			acc = acc.concat(dog.subDogs);
			return acc;
		}, [])));
		
		allDogListStaticSelectVM = new Vue({
			el : "#all-dogs-selector-wrapper",
			data : { dogData : { dogs : allDogsList } }
		});
		
		selectedDogListVM = new Vue({ 
			el : "#dogs-selected-list-wrapper", 
			data : {
				dogData : { dogs : [] },
				classObject : {
					active : true,
					error : false
				}
			}
		});
	
		allDogListSelectVM = new Vue({ 
			el : "#all-dogs-selector-component-wrapper", 
			data : { 
				dogData : { dogs : allDogsList },
				classObject : {
					active : true,
					error : false
				}, 
				selectedListVM : selectedDogListVM
			}
		});
		
		customSelectedDogListVM = new Vue({ 
			el : "#custom-dogs-selected-list-wrapper", 
			data : {
				dogData : { dogs : [] },
				classObject : {
					active : true,
					error : false
				}
			}
		});
		
		customAllDogListSelectVM = new Vue({ 
			el : "#custom-all-dogs-selector-component-wrapper", 
			data : { 
				dogData : { dogs : allDogsList },
				classObject : {
					active : true,
					error : false
				},
				optionClasses : {
					selected : "custom-list-option-selected"
				},
				selectedListVM : customSelectedDogListVM
			} 
		});
	});
}