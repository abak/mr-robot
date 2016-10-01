var req = require('request');
var fs = require("fs");

token = JSON.parse(fs.readFileSync("private-token.json"));

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

var responsibilities = {};

function user_responsibilities(username) {
  this.username = username;
  this.to_merge = [];
  this.to_review = [];
}

req({
    url: 'https://git-av.nvidia.com/api/v3/projects/112/merge_requests', //URL to hit
    qs: {state: "opened"}, //Query string data
    method: 'GET', //Specify the method
    headers: token
}, function(error, response, body){
    if(error) {
        console.log(error);
    } else {
      merge_requests = JSON.parse(body);
      for (var merge_request in merge_requests) {
       var mr_data = parse_merge_request(merge_requests[merge_request]);
       inverse_index(mr_data);
      }
      console.log(responsibilities);

    }
});

function parse_merge_request(merge_request) {
  var result = {
    url:merge_request.web_url,
    reviewers:[],
    mergers:[],
    author:merge_request.author.username,
  };

  var lines = merge_request.description.split(/\r?\n/);
  for (idx in lines) {
    var line = lines[idx];
    if(line.trim().indexOf("###") == -1) continue;

    var reviewers = find_usernames_with_keyword(line, "Reviewer");
    result.reviewers = result.reviewers.concat(reviewers);

    var mergers = find_usernames_with_keyword(line, "Merger");
    result.mergers = result.mergers.concat(mergers);
    
  }
  return result;
}

function find_usernames_with_keyword(description_line, keyword) {
  var result = []
  if (description_line.indexOf(keyword) != -1 && description_line.indexOf("@") != -1) {
    var words = description_line.split(" ");
    for (var i = 0; i < words.length; i++) { 
      var word = words[i];
      if(word.indexOf("@") == 0) {
        result.push(word.substring(1));
      }
    }
  }
    return result;
}


function inverse_index(mr_data) {
  for (idx = 0 ; idx < mr_data.mergers.length ; ++idx) {
    var merger = mr_data.mergers[idx];

    if(! responsibilities.hasOwnProperty(merger)) {
      responsibilities[merger] = new user_responsibilities(merger);
    }
    responsibilities[merger].to_merge.push(mr_data.url);

  }

  for (idx = 0 ; idx < mr_data.reviewers.length ; ++idx) {
    var reviewer = mr_data.reviewers[idx];

    if(! responsibilities.hasOwnProperty(reviewer)) {
      responsibilities[reviewer] = new user_responsibilities(reviewer);
    }

    responsibilities[reviewer].to_review.push(mr_data.url);

  }


}