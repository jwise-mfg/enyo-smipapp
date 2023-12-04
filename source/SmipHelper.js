Smip = {
    name: "SmipHelper",
    instanceGraphQLEndpoint: "",
    currentBearerToken: "",
    clientId: "",
    userName: "",
    clientSecret: "",
    role: "",
    logHelper: null,
    retries: 0,
    log: function (output) {
        if (this.logHelper) {
            this.logHelper(output);
        } else {
            console.log(output);
        }
    },

    performGraphQLRequest: function (query, callBack) {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("POST", this.instanceGraphQLEndpoint);
        xmlhttp.setRequestHeader('Content-Type', 'application/json');
        if (this.currentBearerToken)
            xmlhttp.setRequestHeader('Authorization', this.currentBearerToken);
        else
            enyo.log("No current bearer token set, an auth request is required")
        xmlhttp.send(query);
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == XMLHttpRequest.DONE) {
                if (xmlhttp.responseText.indexOf("expired") != -1 || xmlhttp.responseText.indexOf("permission denied") != -1)
                {
                    this.currentBearerToken = false;
                    enyo.warn("Bearer Token expired!");
                    enyo.log("Attempting to retreive a new GraphQL Bearer Token...");

                    Smip.getBearerToken(function(newTokenResponse) {
                        this.currentBearerToken = "Bearer " + newTokenResponse;
                        enyo.log("New Token received: " + JSON.stringify(newTokenResponse));
                        this.performGraphQLRequest(query, callBack.bind(this));
                    }.bind(this));
                    
                } else {
                    if (callBack)
                        callBack(xmlhttp.responseText);
                }
            }
        }.bind(this);
    },

    getBearerToken: function (callBack) {
        this.retries++;
        if (this.retries <=3) {
            // Step 1: Request a challenge
            this.performGraphQLRequest(JSON.stringify({
                "query": " mutation {\
                    authenticationRequest(input: \
                    {authenticator:\"" + this.clientId + "\", \
                    role: \"" + this.role + "\", \
                    userName: \"" + this.userName + "\"})\
                    { jwtRequest { challenge, message } } }"
            }), function(responseText) {
                var authResponse = JSON.parse(responseText);
                var challenge = authResponse.data.authenticationRequest.jwtRequest.challenge;
                
                // Step 2: Get token
                this.performGraphQLRequest(JSON.stringify({
                    "query": " mutation {\
                        authenticationValidation(input: \
                        {authenticator:\"" + this.clientId + "\", \
                        signedChallenge: \"" + challenge + "|" + this.clientSecret + "\"})\
                        { jwtClaim } }"
                }), function(responseText) {
                    var challengeResponse = JSON.parse(responseText);
                    newJwtToken = challengeResponse.data.authenticationValidation.jwtClaim;
                    callBack(newJwtToken);
                }.bind(this));
            }.bind(this));
        } else {
            enyo.warn("Failed to log-in to the SMIP after too many tries");
        }
    },

    Queries: {
        getEquipment: function(parentId) { 
            if (!parentId) {
                return JSON.stringify({
                    "query": " query {\
                        equipments {\
                        id\
                        displayName\
                        typeName\
                        }\
                    }",
                });     
            } else {
                return JSON.stringify({
                    "query": " query {\
                        equipments (filter: { partOfId: { equalTo: \"" + parentId + "\" } } ) {\
                        id\
                        displayName\
                        typeName\
                        }\
                    }",
                });
            }
          },
        getEquipmentOfType: function(typeName, parentId) {
            if (!parentId) {
                return JSON.stringify({
                    "query": " query {\
                        equipments (filter: { typeName: { equalTo: \"" + typeName + "\" } } ) {\
                        id\
                        displayName\
                        typeName\
                        }\
                    }",
                });
            } else {
                return JSON.stringify({
                    "query": " query {\
                        equipments (filter: { typeName: { equalTo: \"" + typeName + "\" },\
                            partOfId: { equalTo: \"" + parentId + "\" } } ) {\
                        id\
                        displayName\
                        typeName\
                        }\
                    }",
                });
            }

        },
        // query to find details of a piece of equipment given its id
        getAttributesForEquipmentById: function (parentId) {
            return JSON.stringify({
                "query": " query {\
                    attributes (filter: { partOfId: { equalTo: \"" + parentId + "\" } } ) {\
                        id\
                        displayName\
                        dataType\
                        measurementUnit {\
                            displayName\
                        }\
                   }\
                }",
            });
        },
        // query to get historical data for a given attribute, time range and data type
        getHistoricalData: function(attrId, starttime, endtime, datatype) {
            datatype = datatype.toLowerCase() + "value";
            return JSON.stringify({
              "query": " query {\
                    getRawHistoryDataWithSampling(\
                        ids: [\"" + attrId + "\"],\
                        startTime: \"" + starttime + "\", \
                        endTime: \"" + endtime + "\" \
                        maxSamples: 0 \
                    ) { id \
                        ts \
                        " + datatype + " \
                    } \
                }" 
            });
        }
    }
}