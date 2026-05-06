# frozen_string_literal: true

require 'rouge'

# Custom Rouge lexer for Common Intermediate Language (CIL / MSIL / ILAsm).
# Token categories are derived from the official ILAsm grammar:
#   https://github.com/dotnet/runtime/blob/main/src/coreclr/ilasm/asmparse.y
# Opcodes cover all of ECMA-335 Partition III plus common .NET extras.
module Rouge
  module Lexers
    class Cil < RegexLexer
      title 'CIL'
      desc 'Common Intermediate Language (CIL / MSIL / ILAsm)'

      tag 'cil'
      aliases 'il', 'msil', 'ilasm'
      filenames '*.il'
      mimetypes 'text/x-cil'

      # ── Opcodes (ECMA-335 Partition III + .NET extras) ───────────────────
      # Source: opcodes.def / CEE_* constants in corinfo.h
      OPCODES = %w[
        add add.ovf add.ovf.un and arglist
        beq beq.s bge bge.s bge.un bge.un.s
        bgt bgt.s bgt.un bgt.un.s
        ble ble.s ble.un ble.un.s
        blt blt.s blt.un blt.un.s
        bne.un bne.un.s box br br.s break
        brfalse brfalse.s brinst brinst.s brnull brnull.s brtrue brtrue.s
        brzero brzero.s
        call calli callvirt castclass ceq cgt cgt.un ckfinite clt clt.un
        constrained.
        conv.i conv.i1 conv.i2 conv.i4 conv.i8
        conv.ovf.i conv.ovf.i.un
        conv.ovf.i1 conv.ovf.i1.un conv.ovf.i2 conv.ovf.i2.un
        conv.ovf.i4 conv.ovf.i4.un conv.ovf.i8 conv.ovf.i8.un
        conv.ovf.u conv.ovf.u.un
        conv.ovf.u1 conv.ovf.u1.un conv.ovf.u2 conv.ovf.u2.un
        conv.ovf.u4 conv.ovf.u4.un conv.ovf.u8 conv.ovf.u8.un
        conv.r.un conv.r4 conv.r8
        conv.u conv.u1 conv.u2 conv.u4 conv.u8
        cpblk cpobj div div.un dup
        endfilter endfinally
        initblk initobj isinst jmp
        ldarg ldarg.0 ldarg.1 ldarg.2 ldarg.3 ldarg.s ldarga ldarga.s
        ldc.i4 ldc.i4.0 ldc.i4.1 ldc.i4.2 ldc.i4.3 ldc.i4.4
        ldc.i4.5 ldc.i4.6 ldc.i4.7 ldc.i4.8 ldc.i4.m1 ldc.i4.M1 ldc.i4.s
        ldc.i8 ldc.r4 ldc.r8
        ldelem ldelem.i ldelem.i1 ldelem.i2 ldelem.i4 ldelem.i8
        ldelem.r4 ldelem.r8 ldelem.ref ldelem.u1 ldelem.u2 ldelem.u4
        ldelema ldfld ldflda ldftn
        ldind.i ldind.i1 ldind.i2 ldind.i4 ldind.i8
        ldind.r4 ldind.r8 ldind.ref ldind.u1 ldind.u2 ldind.u4
        ldlen ldloc ldloc.0 ldloc.1 ldloc.2 ldloc.3 ldloc.s ldloca ldloca.s
        ldnull ldobj ldsfld ldsflda ldstr ldtoken ldvirtftn
        leave leave.s localloc mkrefany
        mul mul.ovf mul.ovf.un neg newarr newobj no. nop not or pop
        readonly. refanytype refanyval rem rem.un ret rethrow
        shl shr shr.un sizeof
        starg starg.s stelem stelem.i stelem.i1 stelem.i2 stelem.i4 stelem.i8
        stelem.r4 stelem.r8 stelem.ref stfld
        stind.i stind.i1 stind.i2 stind.i4 stind.i8 stind.r4 stind.r8 stind.ref
        stloc stloc.0 stloc.1 stloc.2 stloc.3 stloc.s stobj stsfld
        sub sub.ovf sub.ovf.un switch tail. throw unaligned. unbox unbox.any
        volatile. xor
      ].freeze

      # ── Assembler directives (dot-prefixed tokens from asmparse.y) ───────
      DIRECTIVES = %w[
        .addon .assembly .base .class .corflags .ctor .cctor .custom .data
        .emitbyte .entrypoint .event .export .field .file .fire .get
        .hash .imagebase .import .language .line .locale .locals
        .manifestres .maxstack .method .module .mresource .namespace
        .nester .other .override .pack .param .permission .permissionset
        .property .publickey .publickeytoken .removeon .set .size
        .stackreserve .subsystem .this .try .typedef .template
        .typelist .mscorlib .ver .vtable .vtentry .vtfixup .zeroinit
      ].freeze

      # ── Attribute / modifier keywords (asmparse.y class/method/field attrs) ─
      ATTRIBUTES = %w[
        abstract aggressiveinlining aggressiveoptimization alignment ansi as
        assembly async at auto autochar beforefieldinit bestfit byreflike
        catch cdecl charmaperror cil class default demand deny
        extends explicit extended famandassem family famorassem fastcall fault
        field filter final finally forwardref forwarder hidebysig implements
        import init initonly internalcall instance interface lasterr legacy
        library linkcheck literal managed marshal method native nested newslot
        noinlining nomangle nooptimization noplatform nometadata notserialized
        on off optil out override permitonly pinned pinvokeimpl
        prejitdeny prejitgrant preservesig private privatescope property
        protected public reqmin reqopt reqrefuse reqsecobj request
        retargetable rtspecialname runtime sealed sequential serializable
        specialname static stdcall strict synchronized thiscall to
        unmanaged unmanagedexp vararg virtual void volatile windowsruntime
        winapi with
      ].freeze

      # ── Primitive / built-in types (asmparse.y %token VOID_ BOOL_ etc.) ──
      TYPES = %w[
        bool bytearray char float float32 float64 int int8 int16 int32 int64
        native nullref object string typedref
        uint uint8 uint16 uint32 uint64 unsigned value valuetype void
      ].freeze

      # ── Security action keywords ──────────────────────────────────────────
      SEC_ACTIONS = %w[
        assert deny inheritcheck linkcheck noncasdemand noncasinheritance
        noncaslinkdemand permitonly prejitdeny prejitgrant request
        reqmin reqopt reqrefuse
      ].freeze

      # Build alternation regexes once at class load time
      # Directives must be matched before generic word rules
      DIRECTIVE_RE = /#{DIRECTIVES.sort_by(&:length).reverse
                         .map { |d| Regexp.escape(d) }.join('|')}/i.freeze

      # Opcodes: many contain dots, so we use a word-boundary only at the start
      OPCODE_RE    = /\b(?:#{OPCODES.sort_by(&:length).reverse
                            .map { |op| Regexp.escape(op) }.join('|')})(?!\w)/i.freeze

      ATTRIBUTE_RE = /\b(?:#{(ATTRIBUTES + SEC_ACTIONS).uniq.sort_by(&:length).reverse
                              .map { |a| Regexp.escape(a) }.join('|')})\b/i.freeze

      TYPE_RE      = /\b(?:#{TYPES.sort_by(&:length).reverse
                            .map { |t| Regexp.escape(t) }.join('|')})\b/i.freeze

      state :root do
        # ── Whitespace ──────────────────────────────────────────────────────
        rule %r/\s+/, Text::Whitespace

        # ── Comments ────────────────────────────────────────────────────────
        rule %r(//.*$), Comment::Single
        rule %r(/\*), Comment::Multiline, :block_comment

        # ── Compilation-control directives  (#ifdef, #define …) ─────────────
        rule %r/#\s*(?:define|undef|ifdef|ifndef|else|endif|include)\b.*$/, Comment::Preproc

        # ── Assembler directives (.class, .method …) ──────────────────────
        rule DIRECTIVE_RE, Keyword::Declaration

        # ── Opcodes (must come before generic identifier rule) ─────────────
        rule OPCODE_RE, Keyword

        # ── Primitive types ────────────────────────────────────────────────
        rule TYPE_RE, Keyword::Type

        # ── Attribute / modifier keywords ──────────────────────────────────
        rule ATTRIBUTE_RE, Keyword::Reserved

        # ── Boolean / null literals ────────────────────────────────────────
        rule %r/\b(?:true|false|null)\b/i, Keyword::Constant

        # ── Local variable slots  V_0, V_1 … ──────────────────────────────
        rule %r/\bV_\d+\b/, Name::Variable

        # ── Assembly-qualified refs: [Assembly]Type::Member ──────────────────
        rule %r/\[[\w.$@]+\](?:'[^']*'|[\w.$@`\/])+(?:::'[^']*'|::[\w.$@`]+)?/, Name::Function

        # ── Type::Member references (quoted or plain names) ──────────────────
        rule %r/(?:'[^']*'|[A-Za-z_$@`][\w.$@`\/]*)::(?:'[^']*'|[\w.$@`]+)/, Name::Function
        rule %r/(?:'[^']*'|[A-Za-z_$@`][\w.$@`\/]*)(?=::)/, Name::Namespace

        # ── Labels (word or quoted name followed by lone colon) ──────────────
        rule %r/(?:'[^']*'|[A-Za-z_$@?][\w$@?]*)\s*:(?!:)/, Name::Label

        # ── Numeric literals ────────────────────────────────────────────────
        rule %r/0[xX][0-9A-Fa-f]+/, Literal::Number::Hex
        rule %r/-?\d+\.\d*(?:[eE][+-]?\d+)?/, Literal::Number::Float
        rule %r/-?\d+/, Literal::Number::Integer

        # ── Double-quoted string literals ────────────────────────────────────
        rule %r/"(\\.|[^"\\])*"/, Literal::String::Double

        # ── Single-quoted names (SQSTRING = identifier in ILAsm grammar) ─────
        # In IL, single quotes denote compiler-generated identifiers, not strings.
        # String literals always use double quotes (QSTRING in asmparse.y).
        rule %r/'[^']*'/, Name

        # ── Punctuation ─────────────────────────────────────────────────────
        rule %r/::/, Punctuation
        rule %r/[{}()\[\],.<>+\-*\/=!&|^~%:;?]/, Punctuation

        # ── Catch-all identifiers ───────────────────────────────────────────
        rule %r/[A-Za-z_$@?`][\w$@?.`]*/, Name
      end

      state :block_comment do
        rule %r/[^*\/]+/, Comment::Multiline
        rule %r/\*\//, Comment::Multiline, :pop!
        rule %r/[*\/]/, Comment::Multiline
      end
    end
  end
end
