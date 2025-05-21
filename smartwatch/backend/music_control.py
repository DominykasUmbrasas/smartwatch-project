from flask import Blueprint, request, jsonify
import requests

music_api = Blueprint('music_api', __name__)

YOUTUBE_API_KEY = 'AIzaSyB-zmGrtVI2OFjW_aIIF_Ryt_PDd70WcZo'

@music_api.route('/search', methods=['POST'])
def search_song():
    data = request.get_json()
    query = data.get('query')

    if not query:
        return jsonify({'error': 'Missing search text'}), 400

    youtube_url = 'https://www.googleapis.com/youtube/v3/search'
    params = {
        'part': 'snippet',
        'q': query,
        'key': YOUTUBE_API_KEY,
        'type': 'video',
        'maxResults': 1
    }

    response = requests.get(youtube_url, params=params)

    if response.status_code != 200:
        return jsonify({'error': 'YouTube API klaida'}), 500

    results = response.json().get('items', [])

    if not results:
        return jsonify({'error': 'No results found'}), 404

    video_id = results[0]['id']['videoId']
    return jsonify({'videoId': video_id})
