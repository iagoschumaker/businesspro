import React, { useState, useCallback } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  templateColumns: string[];
  onImport: (data: any[]) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  title,
  templateColumns,
  onImport
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.includes('spreadsheet') || droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const downloadTemplate = () => {
    // Create CSV template
    const csvContent = templateColumns.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${title.toLowerCase().replace(' ', '_')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const processImport = async () => {
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      // Simulate file processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful import
      const mockData = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        ...templateColumns.reduce((acc, col) => ({
          ...acc,
          [col]: `Valor ${i + 1} para ${col}`
        }), {})
      }));

      onImport(mockData);
      setImportResult({
        success: 10,
        errors: []
      });
    } catch (error) {
      setImportResult({
        success: 0,
        errors: ['Erro ao processar arquivo']
      });
    } finally {
      setImporting(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setImportResult(null);
    setImporting(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={resetModal} title={title} size="lg">
      <div className="space-y-6">
        {/* Template Download */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300">
                Baixar Modelo
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                Baixe o modelo para preencher com seus dados
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              icon={Download}
              onClick={downloadTemplate}
            >
              Baixar Template
            </Button>
          </div>
        </div>

        {/* File Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          
          {file ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Arquivo selecionado: {file.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setFile(null)}
              >
                Remover arquivo
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Arraste e solte seu arquivo aqui ou
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.csv"
                  onChange={handleFileInput}
                />
                <span className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar arquivo
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Formatos aceitos: .xlsx, .csv
              </p>
            </div>
          )}
        </div>

        {/* Expected Columns */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Colunas esperadas no arquivo:
          </h4>
          <div className="flex flex-wrap gap-2">
            {templateColumns.map((column, index) => (
              <span
                key={index}
                className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded"
              >
                {column}
              </span>
            ))}
          </div>
        </div>

        {/* Import Result */}
        {importResult && (
          <div className={`p-4 rounded-lg ${
            importResult.errors.length === 0
              ? 'bg-green-50 dark:bg-green-900/20'
              : 'bg-red-50 dark:bg-red-900/20'
          }`}>
            <div className="flex items-center">
              {importResult.errors.length === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  importResult.errors.length === 0
                    ? 'text-green-900 dark:text-green-300'
                    : 'text-red-900 dark:text-red-300'
                }`}>
                  {importResult.errors.length === 0
                    ? `Importação concluída! ${importResult.success} registros processados.`
                    : 'Erro na importação'
                  }
                </p>
                {importResult.errors.map((error, index) => (
                  <p key={index} className="text-sm text-red-700 dark:text-red-400 mt-1">
                    {error}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={resetModal}>
            {importResult ? 'Fechar' : 'Cancelar'}
          </Button>
          {!importResult && (
            <Button
              onClick={processImport}
              disabled={!file || importing}
            >
              {importing ? 'Importando...' : 'Importar Dados'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ImportModal;