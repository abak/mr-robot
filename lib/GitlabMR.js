var req = require('request');


function GitlabMR(configuration) {

  if (!configuration.hasOwnProperty("base_url") 
    && !(typeof configuration.base_url === 'string')) {
    throw "Configuration must contain a base_url string";
  }

  if (!configuration.hasOwnProperty("projects") 
    && !Array.isArray(configuration.projects)) {
    throw "Configuration.projects must contain an array of projects ID";
  }

  if (!configuration.hasOwnProperty("token")
    && !configuration.token.hasOwnProperty("private-token")
    && !configuration.token.hasOwnProperty("sudo")) {
    throw "Configuration must contain a token object containing \"private-token\" and \"sudo\" values";
  }

  var GitlabMR = {
    base_url : configuration.base_url,
    projects : configuration.projects,
    token : configuration.token
  };

  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

  var responsibilities = {};

  function user_responsibilities(username) {
    this.username = username;
    this.to_merge = [];
    this.to_review = [];
  }

  function get_mr_for_project(projectID, callback) {
    req({
      url: GitlabMR.base_url + '/api/v3/projects/' + projectID + '/merge_requests', 
      qs: {state: "opened"}, 
      method: 'GET', 
      headers: GitlabMR.token
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

  GitlabMR.get_merge_requests = function() {
    for(var idx = 0 ; idx < GitlabMR.projects.length ; ++idx) {
      get_mr_for_project(GitlabMR.projects[idx], null);
    }
  }

  return GitlabMR;
}

module.exports = GitlabMR;