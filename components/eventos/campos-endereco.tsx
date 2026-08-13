import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { UFS } from "@/lib/mock/ufs";

export type EnderecoForm = {
  rua: string;
  quadra: string;
  lote: string;
  cep: string;
  setor: string;
  cidade: string;
  estado: string;
};

type CamposEnderecoProps = {
  endereco: EnderecoForm;
  onChange: (campo: keyof EnderecoForm, valor: string) => void;
};

// Bloco de campos do endereço do evento (opcional). Usado nos formulários
// de criação e edição de evento para alimentar o mapa do Google.
export function CamposEndereco({ endereco, onChange }: CamposEnderecoProps) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        Endereço do evento
      </p>
      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
        Opcional. Preencha para exibir o mapa do evento no Google Maps.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="enderecoRua"
          label="Rua"
          placeholder="Ex: Av. das Nações Unidas"
          value={endereco.rua}
          onChange={(e) => onChange("rua", e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="enderecoQuadra"
            label="Quadra (Qd)"
            placeholder="Ex: 12"
            value={endereco.quadra}
            onChange={(e) => onChange("quadra", e.target.value)}
          />
          <Input
            id="enderecoLote"
            label="Lote (Lt)"
            placeholder="Ex: 8"
            value={endereco.lote}
            onChange={(e) => onChange("lote", e.target.value)}
          />
        </div>

        <Input
          id="enderecoCep"
          label="CEP"
          placeholder="Ex: 04578-000"
          value={endereco.cep}
          onChange={(e) => onChange("cep", e.target.value)}
        />

        <Input
          id="enderecoSetor"
          label="Setor"
          placeholder="Ex: Central"
          value={endereco.setor}
          onChange={(e) => onChange("setor", e.target.value)}
        />

        <Input
          id="enderecoCidade"
          label="Cidade"
          placeholder="Ex: São Paulo"
          value={endereco.cidade}
          onChange={(e) => onChange("cidade", e.target.value)}
        />

        <Select
          id="enderecoEstado"
          label="Estado (UF)"
          value={endereco.estado}
          onChange={(e) => onChange("estado", e.target.value)}
        >
          <option value="">Selecione…</option>
          {UFS.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
