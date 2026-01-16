#!/bin/bash
# Quick fix for TypeScript strict mode errors

# Fix error type assertions
find src -name "*.ts" -type f -exec sed -i 's/} catch (error) {/} catch (error: any) {/g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/} catch (err) {/} catch (err: any) {/g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/} catch (e) {/} catch (e: any) {/g' {} \;

echo "Fixed error type assertions"
