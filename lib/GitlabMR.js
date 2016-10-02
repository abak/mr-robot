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
    token : configuration.token,
    parsing_callback : configuration.parsing_callback
  };

  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';


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
        // console.log(body);
        merge_requests = JSON.parse(body);
        for (var merge_request in merge_requests) {
          callback(merge_request);
        }
      }
    });
  }

  GitlabMR.get_merge_requests = function() {
    for(var idx = 0 ; idx < GitlabMR.projects.length ; ++idx) {
      get_mr_for_project(GitlabMR.projects[idx], GitlabMR.parsing_callback);
    }
  }

  return GitlabMR;
}

module.exports = GitlabMR;