'use strict';
const config = require('./config.json');
const tool = require('./tool.js')
const ytdl = require('ytdl-core')
const ySearch = require("youtube-search");
const Song = require('./obj/Song.js');
const MusicPlayer = require('./obj/MusicPlayer');
const youtubeDl = require('youtube-dl');
const rp = require('request-promise');

module.exports.processCommands = processCommands;

let guilds = {};

function processCommands(msg){
	if(!msg.guild.available) return;

	if(!guilds[msg.guild.id]){
		guilds[msg.guild.id] = new MusicPlayer(msg.guild);
	}

	let guild = guilds[msg.guild.id];
	let musicCmd =msg.content.split(/\s+/)[1];
	if (musicCmd)
		musicCmd.toLowerCase();
	switch(musicCmd) {
		case 'play':
			return processInput(msg, guild);
		case 'skip':
			return guild.skipSong(msg);
		case 'pause':
			return guild.pauseSong(msg);
		case 'resume':
			return guild.resumeSong(msg);
		case 'queue':
			return guild.printQueue(msg)
		case 'np':
			return guild.nowPlaying(msg);
		case 'vol':
			return guild.setVolume(msg);
		case 'purge':
			return guild.purgeQueue(msg);
		case 'join':
			return guild.joinVc(msg);
		case 'leave':
			return guild.leaveVc(msg);
		default:
		msg.channel.send(`Merci de vous referrez à ${tool.wrap(`${config.prefix}help music`)}`);
	}
}

function timer(){
	for (let guildID in guilds){
		let guild = guilds[guildId]
		if(guild.status == 'stopped' || guild.status == 'paused')
			guild.inactivityTimer -= 10;
        if (guild.inactivityTimer <= 0) {
            guild.voiceConnection.disconnect();
            guild.voiceConnection = null;
            guild.musicChannel.send(`:no_entry_sign: Plus de musique !`);

            guild.changeStatus('offline');
		}
	}	
}

function processInput(msg, guild) {
	let url = msg.content.split(/\s+/).slice(2).join(' ');
	if (url) { 
		if(!url.startsWith('http')){
			processSearch(msg, guild, url);
		} else if (url.search('youtube.com')){
			let playlist = url.match(/list=(\S+?)(&|\s|$|#)/);
			if (playlist) {
				processYoutube.playlist(msg, guild, playlist[1]);
			}else if (url.search(/v=(\S+?)(&|\s|$|#)/)){
				processYoutube.song(msg, guild, url);
			}else{
			 	msg.channel.send('le lien est invalide');
			}
  	  
	 	} else if (url.search('soundcloud.com')) {
	 		msg.channel.send('Désoler le bot ne prend pas en charge SoundCloud pour le moment');
	 	}else{
	 		msg.channel.send('Désoler seulement les liens youtube');
	 	}
	}
}

function processSearch(msg, guild, searchQuery) {
const opts = {
    maxResults: 3,
    key: config.youtube_api_key
};
    ySearch(searchQuery, opts, function (err, results) {
        if (err) {
            msg.channel.send(`Désoler, je n'est pas trouvé votre song.`);
            return console.log(err);
        }
        for (var y = 0; results[y].kind === 'youtube#channel'; y++);
        ytdl.getInfo(results[y].link, function (err, song) {
            if (err) {
                msg.channel.send(`Désoler, je n'est pas trouvé votre song.`);
                return console.log(err);
            }
            const author  = msg.author.username + '#' + msg.author.discriminator;
            guild.queueSong(new Song(song.title, song.video_url, 'youtube',  author, time(song.length_seconds), song.iurlmq));
                    msg.channel.send(
            `Ajouter à la queue ${tool.wrap(song.title.trim())} (\`${time(song.length_seconds)}\`) demandé par ${tool.wrap(author)}`
        );

        if (guild.status != 'playing')
            guild.playSong(msg, guild);
    
        });
    });
}

const processYoutube = {

	song(msg, guild, url){
		ytdl.getInfo(url, (err, song) => {
			if (err) {
				console.log(err);
				msg.channel.send(`Désoler je ne peux pas ajouter la musique`);
				return;
			}
			guild.queueSong(new Song(song.title, url, 'youtube'));
			msg.channel.send(`Ajouter à la queue ${tool.wrap(song.title.trim())} demandé par ${tool.wrap(msg.author.username + '#') + msg.author.discriminator}`);
		if(guild.status != 'playing'){
			guild.playSong(msg);
		}
		});
	},

	playlist(msg, guild, playlistId){
		const youtubeApiUrl = 'https://www.googleapis.com/youtube/v3/';
		
		Promise.all([getPlaylistName(), getPlaylistSong([], null)])
		.then(results => addToQueue(results[0], results[1]))
		.catch(err => {
			console.log(err);
			msg.channel.send(`
				Désoler, je ne peux pas ajouter la playlist à la queue`)
		});

		async function getPlaylistName() {
			let option = {
				url : `${youtubeApiUrl}playlist?id=${playlistId}&part=snippet&key=${config.youtube_api_key}`
			}
			let body = await rp(options);
			let playlistTitle =JSON.parse(body).items[0].snippet.title;
			return playlistTitle
		}
		async function getPlaylistSongs(playlistItems, pageToken){
			pageToken = pageToken ? `&pageToken=${pageToken}` : '';
			let options = {
				url: `${youtubeApiUrl}playlistName?playlistID=${playlistID}${pageToken}&part=snippet&fields.nextPageToken,items(snippet(time;resourceID/videoId))&maxResults=50&key=${config.youtube_api_key}`
			}

			let body = await rp(options);
			let playlist = JSON.parse(body);
			playlistItems = playlistItems.concat(playlist.items.filter(item => itme.snippet.title != 'video supprimer'));
		
		if(playlist.hasOwnProperty('nextPageToken')){
			playlistItems = await getPlaylistSongs(playlistItems, playlist.nextPageToken);
		}
		return playlistItems;

	}

	async function addToQueue(playlistTitle, playlistItems){
		let queueLength = guild.queue.length;

		for (let i = 0; 1 < playlistItems.lenth; i++){
			let song= new Song(playlistItems[1].snippet.title, `https://youtube.com/watch?v=${playlistItems[i].snippet.resourceId.videoId}`, 'youtube');
			guild.queueSong(song, i + queueLength);
		}

		msg.channel.send(`Ajouter à la queue ${tool.wrap(playlistItems.lenth)}`);
		if(guild.playSong(msg)){
			guild.playSong(msg);
			}
		}	
	}
}

function time(timesec){
        let upTimeOutput = "";
        if (timesec<60) {
            upTimeOutput = `${timesec}s`;
        } else if (timesec<3600) {
            upTimeOutput = `${Math.floor(timesec/60)}:${timesec%60}`;
        } else if (timesec<86400) {
            upTimeOutput = `${Math.floor(timesec/3600)}:${Math.floor(timesec%3600/60)}:${timesec%3600%60}`;
        } else if (timesec<604800) {
            upTimeOutput = `${Math.floor(timesec/86400)}:${Math.floor(timesec%86400/3600)}:${Math.floor(timesec%86400%3600/60)}:${timesec%86400%3600%60}`;
        }
        return upTimeOutput;
}

function timer(){
	for (let guildId in guilds){
		let guild = guilds[guildId]
		if(guild.status == 'stopped' || guild.status == 'paused')
			guild.inactivityTimer -= 10;
        if (guild.inactivityTimer <= 0) {
            guild.voiceConnection.disconnect();
            guild.voiceConnection = null;
            guild.musicChannel.send(`:no_entry_sign: Plus de musique !`);

            guild.changeStatus('offline');
		}
	}	
}
setInterval(timer, 10000);