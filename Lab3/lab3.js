function sendRequest(method, url, callback) {
	let request = new XMLHttpRequest();
	request.open(method, url);
	request.onload = () => callback(request.response);
	request.send();
}

class OpenDotaClient {
	#MAX_MATCHES_COUNT = 20;
	
	getInfo(callback) {
		this.#getMatches(matches => {
			let teams = [];
			for(let match of matches) {
				if(match.radiant_team_id == null || match.radiant_team_id == undefined || match.dire_team_id == null || match.dire_team_id == undefined) {
					continue;
				}
				
				let radiant_index = teams.findIndex(team => team.id == match.radiant_team_id);
				if(radiant_index == -1) {
					teams.push({
						id : match.radiant_team_id,
						matches : [ match ]
					});
				} else {
					teams[radiant_index].matches.push(match);
				}
				
				let dire_index = teams.findIndex(team => team.id == match.dire_team_id);
				if(dire_index == -1) {
					teams.push({
						id : match.dire_team_id,
						matches : [ match ]
					});
				} else {
					teams[dire_index].matches.push(match);
				}
			}
			
			this.#getTeams(teams.map(team => team.id), teamDatas => {
				for(let teamData of teamDatas) {
					let team = teams.find(team => team.id == teamData.team_id);
					for(let match of team.matches) {
						if(match.radiant_team_id == team.id) {
							match.radient_team = teamData;
						} else if (match.dire_team_id == team.id) {
							match.dire_team = teamData;
						}
					}
				}
				callback(matches);
			});
		});
	}
	
	#getMatches = function(callback) {
		sendRequest(
			"GET", "https://api.opendota.com/api/promatches", 
			data => callback(this.#parseMatches(data))
		);
	}
	
	#parseMatches = function(data) {
		let matches = JSON.parse(data);
		return matches.map(match => this.#parseMatch(match)).slice(0, this.#MAX_MATCHES_COUNT - 1);
	}
	
	#parseMatch = function(rawMatch) {
		return {
			match_id : rawMatch.match_id, 
			duration : rawMatch.duration, 
			start_time : rawMatch.start_time, 
			radiant_team_id : rawMatch.radiant_team_id,
			radiant_name : rawMatch.radiant_name,
			dire_team_id : rawMatch.dire_team_id,
			dire_name : rawMatch.dire_name,
			radiant_score : rawMatch.radiant_score,
			dire_score : rawMatch.dire_score,
			radiant_win : rawMatch.radiant_win
		};
	}
	
	#getTeams = function(ids, callback) {
		let teamsData = [];
		for(let id of ids) {
			let tid = id;
			sendRequest(
				"GET", "https://api.opendota.com/api/teams/" + id, 
				team => {
					teamsData.push(this.#parseTeam(team, tid));
					if(teamsData.length == ids.length) {
						callback(teamsData);
					}
				}
			);
		}
	}
	
	#parseTeam = function(team, id) {
		if(team == "") {
			return { team_id : id };
		}
		
		let data = JSON.parse(team);
		return {
			team_id : data.team_id,
			rating : data.rating,
			wins : data.wins,
			losses : data.losses,
			name : data.name,
			logo_url : data.logo_url
		}
	}
}

let matchComponent;
let teamComponent;

let DotaClient = new OpenDotaClient();

function initComponents() {
	Vue.filter('urlToCssProp', url => {
		return "--img : url(" + url + ");";
	});
	
	Vue.filter('ratingColor', rating => {
		let color = "green";
		if(rating < 1250) {
			color = "orange";
		}
		if(rating < 1100) {
			color = "red";
		}
		
		return "--rateColor : " + color; 
	});
	
	teamComponent = Vue.component('team', {
		props: ['team'],
		template : 
		`<div>
			<center>
				<div v-bind:style="team.logo_url | urlToCssProp" class="team-logo"></div>
				<div v-if="team != undefined && team.name != undefined">{{ team.name }}</div>
				<div v-if="team == undefined || team.name == undefined">*Unknown*</div>
				<div v-if="team != undefined && team.wins != undefined">Побед: {{ team.wins }}</div>
				<div v-if="team == undefined || team.wins == undefined">Побед: ?</div>
				<div v-if="team != undefined && team.losses != undefined">Поражений: {{ team.losses }}</div>
				<div v-if="team == undefined || team.losses == undefined">Поражений: ?</div>
				<div v-bind:style="team.rating | ratingColor" class="team-rate" 
					 v-if="team != undefined && team.rating != undefined">Рейтинг: {{ team.rating }}</div>
				<div v-if="team == undefined || team.rating == undefined">Рейтинг: ?</div>
			</center>
		</div>`
	});
	
	matchComponent = Vue.component('match', {
		props: ['match'],
		methods : {
			removeMatch : function() {
				let matchIndex = this._context.$data.matches.findIndex(match => match.match_id == this.match.match_id);
				this._context.$data.matches.splice(matchIndex, 1);
			}
		}, template : 
		`<div> 
			<table width="100%"> 
				<tr>
					<td><span>#{{ match.match_id }}</span></td>
					<td></td>
					<td style="float: right">
						<button v-on:click="removeMatch()">X</button>
					</td>
				</tr>
				<tr>
					<td colspan="3"><center class="match-time">{{ Math.round(match.duration / 60) }} минут</center></td>
				</tr>
				<tr>
					<td>
						<team v-bind:team="match.radient_team"></team>
						<center><div>Счет: {{ match.radiant_score }}</div></center>
					</td>
					<td>
						<center v-if="match.radiant_win">></center>
						<center v-if="!match.radiant_win"><</center>
					</td>
					<td>
						<team v-bind:team="match.dire_team"></team>
						<center><div>Счет: {{ match.dire_score }}</div></center>
					</td>
				</tr>
			</table>
		</div>`
	});
}
	
function initDataBinding() {
	initComponents();
	
	DotaClient.getInfo(matches => {
		new Vue({
			el : "#matches",
			data : { matches : matches }
		});
	});
}