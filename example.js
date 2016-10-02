var gitlab = require(__dirname + '/lib/GitlabMR.js');
var fs = require("fs");

var token = JSON.parse(fs.readFileSync("private-token.json"));

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

var responsibilities = {};

function user_responsibilities(username) {
  this.username = username;
  this.to_merge = [];
  this.to_review = [];
}

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

function merge_request_callback(merge_request) {
  var mr_data = parse_merge_request(merge_requests[merge_request]);
  inverse_index(mr_data);
  console.log(responsibilities);
}

var config = {
    base_url : "https://gitlab.com",
    projects : [1768911],
    token : token,
    parsing_callback : merge_request_callback
};

var gitlab_fetcher = gitlab(config);
gitlab_fetcher.get_merge_requests();