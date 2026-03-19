import http from 'http';

const options = {
  hostname: 'mcp-test.innosynth.org',
  path: '/mcp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
  }
};

// Step 1: Initialize session
console.log('[1] Creating MCP session...');

const initData = JSON.stringify({
  jsonrpc: '2.0',
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-script', version: '1.0.0' }
  },
  id: 1
});

const initReq = http.request(options, (initRes) => {
  let sessionId = initRes.headers['mcp-session-id'];
  let body = '';
  
  if (sessionId) {
    console.log('[2] Session ID:', sessionId);
  }
  
  initRes.on('data', (chunk) => {
    body += chunk;
  });
  
  initRes.on('end', () => {
    if (!sessionId) {
      console.error('No session ID received');
      return;
    }
    
    // Step 2: Create browser session
    console.log('[3] Creating browser session...');
    
    const createSessionData = JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'browserbase_session_create',
        arguments: {}
      },
      id: 2
    });
    
    const createReq = http.request({
      ...options,
      headers: {
        ...options.headers,
        'mcp-session-id': sessionId
      }
    }, (createRes) => {
      let responseBody = '';
      
      createRes.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      createRes.on('end', () => {
        console.log('[4] Browser session response:');
        console.log(responseBody);
        
        // Step 3: Navigate to google.com
        console.log('[5] Navigating to google.com...');
        const navigateData = JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'browserbase_stagehand_navigate',
            arguments: { url: 'https://google.com' }
          },
          id: 3
        });
        
        const navigateReq = http.request({
          ...options,
          headers: {
            ...options.headers,
            'mcp-session-id': sessionId
          }
        }, (navigateRes) => {
          let navBody = '';
          
          navigateRes.on('data', (chunk) => {
            navBody += chunk;
          });
          
          navigateRes.on('end', () => {
            console.log('[6] Navigate response:');
            console.log(navBody);
            
            // Step 4: Observe interactive elements
            console.log('[7] Observing interactive elements...');
            const observeData = JSON.stringify({
              jsonrpc: '2.0',
              method: 'tools/call',
              params: {
                name: 'browserbase_stagehand_observe',
                arguments: { 
                  instruction: 'Find the search input field on the page'
                }
              },
              id: 4
            });
            
            const observeReq = http.request({
              ...options,
              headers: {
                ...options.headers,
                'mcp-session-id': sessionId
              }
            }, (observeRes) => {
              let observeBody = '';
              
              observeRes.on('data', (chunk) => {
                observeBody += chunk;
              });
              
              observeRes.on('end', () => {
                console.log('[8] Observe response:');
                console.log(observeBody);
                
                // Step 5: Act - type in search and click
                console.log('[9] Performing action: typing in search box...');
                const actData = JSON.stringify({
                  jsonrpc: '2.0',
                  method: 'tools/call',
                  params: {
                    name: 'browserbase_stagehand_act',
                    arguments: { 
                      action: 'Type "test search" into the search input'
                    }
                  },
                  id: 5
                });
                
                const actReq = http.request({
                  ...options,
                  headers: {
                    ...options.headers,
                    'mcp-session-id': sessionId
                  }
                }, (actRes) => {
                  let actBody = '';
                  
                  actRes.on('data', (chunk) => {
                    actBody += chunk;
                  });
                  
                  actRes.on('end', () => {
                    console.log('[10] Act response:');
                    console.log(actBody);
                    console.log('\n=== Test completed! ===');
                  });
                });
                
                actReq.on('error', (e) => {
                  console.error('Act request error:', e.message);
                });
                
                actReq.write(actData);
                actReq.end();
              });
            });
            
            observeReq.on('error', (e) => {
              console.error('Observe request error:', e.message);
            });
            
            observeReq.write(observeData);
            observeReq.end();
          });
        });
        
        navigateReq.on('error', (e) => {
          console.error('Navigate request error:', e.message);
        });
        
        navigateReq.write(navigateData);
        navigateReq.end();
      });
    });
    
    createReq.on('error', (e) => {
      console.error('Create session request error:', e.message);
    });
    
    createReq.write(createSessionData);
    createReq.end();
  });
});

initReq.on('error', (e) => {
  console.error('Initialize request error:', e.message);
});

initReq.write(initData);
initReq.end();
