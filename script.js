// script.js
class TrackingAPIClient {
    constructor() {
        this.BASE_URL = "https://tracking-apigateway.rte.com.br";
        this.TOKEN_URL = `${this.BASE_URL}/token`;
        this.TRACKING_URL = `${this.BASE_URL}/api/v1/tracking`;
        this.RECEIPT_URL = `${this.BASE_URL}/api/v1/deliveryreceipt`;
        this.token = null;
    }

    async getAuthToken() {
        const payload = new URLSearchParams({
            auth_type: "DEV",
            grant_type: "password",
            username: "ADORAIND",
            password: "DVNJQOYP"
        });

        try {
            const response = await fetch(this.TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: payload
            });
            
            if (!response.ok) throw new Error('Falha ao obter token');
            const data = await response.json();
            this.token = data.access_token;
            return this.token;
        } catch (error) {
            alert(`Erro ao obter token: ${error.message}`);
            return null;
        }
    }

    async getTrackingInfo(cnpj, nf) {
        if (!this.token) await this.getAuthToken();
        if (!this.token) return null;

        const url = new URL(this.TRACKING_URL);
        url.searchParams.append('TaxIdRegistration', cnpj);
        url.searchParams.append('InvoiceNumber', nf);

        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) throw new Error('Falha na consulta');
            return await response.json();
        } catch (error) {
            alert(`Erro na consulta de tracking: ${error.message}`);
            return null;
        }
    }

    async getDeliveryReceipt(cnpj, nf) {
        if (!this.token) await this.getAuthToken();
        if (!this.token) return null;

        const url = new URL(this.RECEIPT_URL);
        url.searchParams.append('TaxIdRegistration', cnpj);
        url.searchParams.append('InvoiceNumber', nf);

        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) throw new Error('Falha na consulta');
            return await response.json();
        } catch (error) {
            alert(`Erro na consulta de comprovante: ${error.message}`);
            return null;
        }
    }
}

class TrackingApp {
    constructor() {
        this.apiClient = new TrackingAPIClient();
        this.cnpjInput = document.getElementById('cnpj');
        this.nfInput = document.getElementById('nf');
        this.resultText = document.getElementById('result');
        this.btnTracking = document.getElementById('btnTracking');
        this.btnReceipt = document.getElementById('btnReceipt');
        this.btnCobrar = null;

        this.btnTracking.addEventListener('click', () => this.consultarTracking());
        this.btnReceipt.addEventListener('click', () => this.baixarComprovante());
    }

    validateInputs() {
        const cnpj = this.cnpjInput.value.trim();
        const nf = this.nfInput.value.trim();
        if (!cnpj || !nf) {
            alert('Por favor, preencha o CNPJ e o Número da NF.');
            return false;
        }
        return true;
    }

    formatTrackingResult(data) {
        const events = data.Events || [];
        const descriptions = events
            .filter(event => event.Description)
            .map(event => event.Description);
        
        if (!descriptions.length) {
            descriptions.push("Nenhuma informação de trajeto disponível.");
        }
        
        let result = "🛤 Histórico de Transporte:\n\n";
        return result + descriptions
            .map((desc, index) => `📍 Etapa ${index + 1}: ${desc}`)
            .join('\n\n');
    }

    checkDeliveryDelay(data) {
        try {
            const expectedDateStr = data.ExpectedDeliveryDate || "27/02/2025";
            const [day, month, year] = expectedDateStr.split('/');
            const expectedDate = new Date(year, month - 1, day);
            const currentDate = new Date();
            
            const delivered = (data.Events || []).some(event => 
                event.Description?.includes("Entrega finalizada")
            );
            
            return currentDate > expectedDate && !delivered;
        } catch (error) {
            console.error('Erro ao verificar atraso:', error);
            return false;
        }
    }

    async consultarTracking() {
        if (!this.validateInputs()) return;

        const cnpj = this.cnpjInput.value.trim();
        const nf = this.nfInput.value.trim();
        const data = await this.apiClient.getTrackingInfo(cnpj, nf);

        if (data) {
            this.resultText.value = this.formatTrackingResult(data);

            if (this.checkDeliveryDelay(data)) {
                if (!this.btnCobrar) {
                    this.btnCobrar = document.createElement('button');
                    this.btnCobrar.textContent = 'Cobrar Entrega';
                    this.btnCobrar.className = 'btn btn-danger';
                    this.btnCobrar.addEventListener('click', () => {
                        alert('Funcionalidade de email não disponível no navegador. Use o Outlook no desktop.');
                    });
                    this.btnTracking.parentElement.appendChild(this.btnCobrar);
                }
            } else if (this.btnCobrar) {
                this.btnCobrar.remove();
                this.btnCobrar = null;
            }
        }
    }

    async baixarComprovante() {
        if (!this.validateInputs()) return;

        const cnpj = this.cnpjInput.value.trim();
        const nf = this.nfInput.value.trim();
        const data = await this.apiClient.getDeliveryReceipt(cnpj, nf);

        if (data) {
            const receiptUrl = data.ReceiptUrl;
            const base64Image = data.Image;

            if (receiptUrl) {
                alert(`Comprovante disponível: ${receiptUrl}`);
            } else if (base64Image) {
                const link = document.createElement('a');
                link.href = `data:image/png;base64,${base64Image}`;
                link.download = `comprovante_${cnpj}_${nf}_${new Date().toISOString().replace(/[:.]/g, '')}.png`;
                link.click();
            } else {
                alert('Nenhum comprovante encontrado.');
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TrackingApp();
});