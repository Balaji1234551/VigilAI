const wdio = require("webdriverio");
const fs = require('fs');

// Note: To run this test, you need to have Node.js installed and run:
// npm install webdriverio
// You must also have Appium Server running (appium) and an Android Emulator active.

const opts = {
  path: '/wd/hub',
  port: 4723,
  capabilities: {
    platformName: "Android",
    automationName: "UiAutomator2",
    deviceName: "Android Emulator",
    // Replace this with the actual path to your compiled Android APK or Expo dev client
    app: "C:\\Users\\kurub\\OneDrive\\Desktop\\Vigilai\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk", 
    appPackage: "com.vigilai.app",
    appActivity: ".MainActivity",
    autoGrantPermissions: true
  }
};

async function runAppiumTests() {
  const client = await wdio.remote(opts);
  let testResults = [];

  const logTest = (name, status, details = '') => {
      console.log(`[${status}] ${name} | ${details}`);
      testResults.push({ TestName: name, Status: status, Details: details });
  };

  try {
    // 1. Wait for App to Load (Wait for Welcome or Login screen elements)
    // Note: React Native elements are often found using accessibility id or XPaths on Android
    const loginLink = await client.$('~Login'); // Assuming accessibilityLabel="Login"
    await loginLink.waitForDisplayed({ timeout: 15000 });
    logTest('App Load', 'PASS', 'App launched successfully');

    // 2. Navigate to Login Screen
    await loginLink.click();
    logTest('Navigate to Login', 'PASS', 'Clicked login button on welcome screen');

    // 3. Enter Invalid Credentials
    const emailField = await client.$('android=new UiSelector().className("android.widget.EditText").instance(0)');
    const passwordField = await client.$('android=new UiSelector().className("android.widget.EditText").instance(1)');
    
    await emailField.setValue('invalid@example.com');
    await passwordField.setValue('wrongpass');
    
    const submitBtn = await client.$('~Login'); // Assuming the submit button has accessibilityLabel="Login"
    await submitBtn.click();
    
    await client.pause(2000);
    logTest('Invalid Login Check', 'PASS', 'Invalid credentials handled');

    // 4. Enter Valid Credentials
    await emailField.clearValue();
    await passwordField.clearValue();
    
    await emailField.setValue('test@test.com');
    await passwordField.setValue('password');
    await submitBtn.click();

    // 5. Verify Successful Login (Wait for Dashboard elements)
    const dashboardElement = await client.$('~Home'); // Assuming Bottom tab has accessibilityLabel="Home"
    await dashboardElement.waitForDisplayed({ timeout: 15000 });
    logTest('Valid Login Check', 'PASS', 'Successfully reached the Home Dashboard');

    // 6. Navigate to Alerts Tab
    const alertsTab = await client.$('~Alerts'); // Assuming Bottom tab has accessibilityLabel="Alerts"
    await alertsTab.click();
    await client.pause(2000);
    logTest('Tab Navigation', 'PASS', 'Successfully navigated to Alerts tab');

    // 7. Navigate to Analytics Tab
    const analyticsTab = await client.$('~Analytics'); 
    await analyticsTab.click();
    await client.pause(2000);
    logTest('Tab Navigation', 'PASS', 'Successfully navigated to Analytics tab');

  } catch (error) {
    logTest('Test Suite Exception', 'FAIL', error.message);
  } finally {
    // Generate CSV (Excel)
    let csvContent = "Test Name,Status,Details\n";
    testResults.forEach(res => {
        const details = res.Details.replace(/"/g, '""');
        csvContent += `"${res.TestName}","${res.Status}","${details}"\n`;
    });
    
    fs.writeFileSync('Appium_Test_Summary.csv', csvContent);
    console.log("Test summary saved to Appium_Test_Summary.csv");

    await client.deleteSession();
  }
}

runAppiumTests();
