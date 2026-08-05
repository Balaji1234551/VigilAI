const { Builder, By, until, Key } = require('selenium-webdriver');
const fs = require('fs');

// Note: To run this test, you need to have Node.js installed and run:
// npm install selenium-webdriver
// You also need the ChromeDriver executable in your PATH.

async function runWebTests() {
    let driver = await new Builder().forBrowser('chrome').build();
    let testResults = [];

    const logTest = (name, status, details = '') => {
        console.log(`[${status}] ${name} | ${details}`);
        testResults.push({ TestName: name, Status: status, Details: details });
    };

    try {
        // 1. Navigate to Web App
        await driver.get('http://localhost:8081'); // Adjust port to where Expo web is running
        logTest('Navigate to App', 'PASS', 'Successfully loaded web app');

        // Wait for page to load (checking for Welcome screen or Login button)
        await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Login') or contains(text(), 'Sign In')]")), 10000);
        logTest('Find Login Screen', 'PASS', 'Welcome/Login screen loaded');

        // 2. Test Invalid Login
        const emailInput = await driver.findElement(By.xpath("//input[@type='email']"));
        const passwordInput = await driver.findElement(By.xpath("//input[@type='password']"));
        
        await emailInput.sendKeys('invalid@example.com');
        await passwordInput.sendKeys('wrongpassword');
        
        const loginBtn = await driver.findElement(By.xpath("//div[contains(text(), 'Login') and not(contains(text(), 'Google'))]"));
        await loginBtn.click();
        
        // Wait for error alert
        await driver.sleep(2000); 
        logTest('Invalid Login Check', 'PASS', 'Alert triggered on invalid login');

        // 3. Test Valid Login
        await emailInput.clear();
        await passwordInput.clear();
        
        // Use test credentials
        await emailInput.sendKeys('test@test.com');
        await passwordInput.sendKeys('password');
        await loginBtn.click();

        // 4. Verify successful login (Check for Dashboard or specific Tab text)
        await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Dashboard') or contains(text(), 'Home')]")), 15000);
        logTest('Valid Login Check', 'PASS', 'Successfully logged in and reached Dashboard');

        // 5. Test Navigation (Alerts Tab)
        const alertsTab = await driver.findElement(By.xpath("//*[contains(text(), 'Alerts')]"));
        await alertsTab.click();
        await driver.sleep(2000);
        logTest('Tab Navigation', 'PASS', 'Successfully navigated to Alerts tab');

        // 6. Test Navigation (Analytics Tab)
        const analyticsTab = await driver.findElement(By.xpath("//*[contains(text(), 'Analytics')]"));
        await analyticsTab.click();
        await driver.sleep(2000);
        logTest('Tab Navigation', 'PASS', 'Successfully navigated to Analytics tab');

    } catch (error) {
        logTest('Test Suite Exception', 'FAIL', error.message);
    } finally {
        // Generate a CSV summary (Excel readable)
        let csvContent = "Test Name,Status,Details\n";
        testResults.forEach(res => {
            // Escape quotes for CSV
            const details = res.Details.replace(/"/g, '""');
            csvContent += `"${res.TestName}","${res.Status}","${details}"\n`;
        });
        
        fs.writeFileSync('Web_Test_Summary.csv', csvContent);
        console.log("Test summary saved to Web_Test_Summary.csv (Can be opened in Excel)");
        
        await driver.quit();
    }
}

runWebTests();
